import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles';
import { Restivus } from 'meteor/nimble:restivus';
import { _ } from 'meteor/stevezhu:lodash';

import CRIMP from '../imports/settings';
import Categories from '../imports/data/categories';
import Climbers from '../imports/data/climbers';
import Scores from '../imports/data/scores';
import HelpMe from '../imports/data/helpme';
import ActiveTracker from '../imports/data/activetracker';
import RecentScores from '../imports/data/recentscores';


// TODO: For Richard's live stream
import { scoreSystemsNames } from '../imports/score_systems/score-system.js';
import IFSC_TB from '../imports/score_systems/ifsc-top-bonus';
import TFBb from '../imports/score_systems/top-flash-bonus2-bonus1';
function getScoreSystem(scoreSystem) {
  let output;
  switch (scoreSystem) {
    case scoreSystemsNames[0]:
      output = new IFSC_TB();
      break;
    case scoreSystemsNames[1]:
      output = new TFBb();
      break;
    case scoreSystemsNames[2]:   // TODO: Set for points
      output = new TFBb();
      break;
    default:
      output = new IFSC_TB();
  }

  return output;
}


/**
 *  `roleRequired` is commented off at all endpoints because Restivus does
 *  not work with groups in alanning:roles right now. A custom checkRoles
 *  functions is added right at the start, and will throw a Meteor.Error if
 *  the user does not have the permissions for that endpoint.
 *
 *  For documentation of the endpoints, see docs-API.md in the repo
 */
const Api = new Restivus({
  apiPath: 'api/',
  auth: {
    token: 'services.resume.loginTokens.hashedToken',
    user: function authUser() {
      return {
        userId: this.request.headers['x-user-id'],
        token: Accounts._hashLoginToken(this.request.headers['x-auth-token']),
      };
    },
  },
  defaultHeaders: { 'Content-Type': 'application/json' },
  enableCors: true,
  prettyJson: true,
  useDefaultAuth: false,
});


Api.addRoute('judge/login', { authRequired: false }, {
  post: function postLogin() {
    try {
      if (!('fb_access_token' in this.bodyParams)) {
        return {
          statusCode: 400,
          body: { error: 'Missing fb_access_token in body' },
        };
      }

      // Call Facebook to authenticate the access token
      // HTTP.call is synchronous because callback is not provided
      const fbAccessToken = this.bodyParams.fb_access_token;
      let fbResponse;
      try {
        fbResponse = HTTP.call(
          'GET',
          `https://graph.facebook.com/v2.3/me?access_token=${fbAccessToken}`
         );
      } catch (e) {
        return {
          statusCode: 500,
          body: { error: e.message },
        };
      }

      // Clean up FB data to create user profile
      const options = _.pick(fbResponse.data, ['name']);
      let user;
      // Note: updateOrCreateUserFromExternalService is undocumented
      // See comment by n1mmy: https://github.com/meteor/meteor/issues/2648
      user = Accounts.updateOrCreateUserFromExternalService(
        'facebook',
        fbResponse.data,
        { profile: options }
      );

      // Retrieve user document of this user
      user = Meteor.users.findOne(user.userId);

      // Check for existing login tokens
      let hasExistingLogins = false;
      try {
        hasExistingLogins = user.services.resume.loginTokens.length > 0;
      } catch (e) { /* do nothing */ }

      // Find out number of login counts of user
      let tokenCount = user.services.resume.loginTokensCount;
      tokenCount = typeof tokenCount === 'number'
        ? tokenCount + 1
        : 0;

      // Create login token and label the token
      const stampedToken = Accounts._generateStampedLoginToken();
      stampedToken.tokenNumber = tokenCount;

      Accounts._insertLoginToken(user._id, stampedToken);

      // Update user document for loginTokensCount
      Meteor.users.update(user._id, { $set: {
        'services.resume.loginTokensCount': tokenCount,
      } });


      const userRoles = Roles.getRolesForUser(user._id);
      // If it is a new user, set a default role
      if (userRoles.length < 1) {
        userRoles.push(CRIMP.ENVIRONMENT.DEMO_MODE ? 'admin' : 'pending');
        Roles.addUsersToRoles(user._id, userRoles, Roles.GLOBAL_GROUP);
      }

      // If this is the first user, give supreme privileges
      if (Meteor.users.find().count() === 1 &&
          !_.findIndex(userRoles, 'hukkataival')) {
        userRoles.push('hukkataival');
        Roles.addUsersToRoles(user._id, userRoles, Roles.GLOBAL_GROUP);
      }


      return {
        statusCode: 201,
        body: {
          'X-User-Id': user._id,
          'X-Auth-Token': stampedToken.token,
          remind_logout: hasExistingLogins,
          roles: userRoles,
        },
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/logout', { authRequired: true }, {
  post: function postLogout() {
    try {
      const loginToken = this.request.headers['x-auth-token'];
      const hashed = Accounts._hashLoginToken(loginToken);

      Accounts.destroyToken(this.userId, hashed.hashedToken);

      return {
        statusCode: 200,
        body: {},
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/categories', {
  authRequired: false,
  // roleRequired: CRIMP.roles.judges,
}, {
  get: function getCategories() {
    // CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const categoryDocs = Categories.find({}).fetch();
      const picked = [
        '_id',
        'category_name',
        'acronym',
        'is_score_finalized',
        'time_start',
        'time_end',
        'routes',
      ];
      const map = {
        _id: 'category_id',
        score_finalized: 'is_score_finalized',
      };

      // Go through each Category doc to rename/discard keys
      categoryDocs.forEach((doc, index, array) => {
        const truncatedDoc = _.pick(doc, picked);
        const mappedDoc = {};

        // Rename the DB keys to conform with API spec
        _.each(truncatedDoc, (value, key) => {
          const newkey = map[key] || key;
          mappedDoc[newkey] = value;
        });

        // Go through each route to generate score_rules
        (mappedDoc.routes).forEach((route) => {
          let scoreRules = doc.score_system;

          // TODO: Use the scoreSystem object to generate this
          // This is suitable for now because points is the only system that
          // uses this, but eventually we have to extend it for more systems
          if (route.score_rules.points) {
            scoreRules += `__${route.score_rules.points}`;
          }

          route.score_rules = _.toLower(scoreRules);
        });

        array[index] = mappedDoc;
      });

      return {
        statusCode: 200,
        body: { categories: categoryDocs },
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/score', {
  authRequired: true,
  // roleRequired: CRIMP.roles.judges,
}, {
  get: function getScore() {
    CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const allowedOptions = ['event_id',
                              'category_id',
                              'route_id',
                              'climber_id',
                              'marker_id'];
      const options = _.pick(this.queryParams, allowedOptions);
      const scoreSelector = {};

      const targetCategories = [];

      // Event is not stored inside a Score document, hence we need to
      // do a look-up to get all the Categories inside an Event
      if (options.event_id) {
        Categories
          .find({ 'event._id': options.event_id })
          .fetch()
          .forEach((category) => {
            targetCategories.push(category._id);
          });

        scoreSelector.category_id = { $in: targetCategories };
      }


      if (options.category_id) {
        // If Event and Category is specified, check if Category is
        // child of the Event
        if (targetCategories.length
            && !targetCategories.includes(options.category_id)) {
          throw new Meteor.Error('CategoryNotLinkedToEvent');
        } else {
          scoreSelector.category_id = options.category_id;
        }
      }

      // Note: route_id is not checked against the Categories
      if (options.route_id) {
        scoreSelector.scores = { $elemMatch: {
          route_id: options.route_id,
        } };
      }

      if (options.climber_id) {
        scoreSelector.climber_id = options.climber_id;
      }

      if (options.marker_id) {
        scoreSelector.marker_id = options.marker_id;
      }

      const targetScores = Scores.find(scoreSelector);

      if (targetScores.count() === 0) {
        return {
          statusCode: 200,
          body: { climber_scores: [] },
        };
      }

      // Get set of climbers affected by operation
      let targetClimbers = [];
      targetScores.fetch().forEach((score) => {
        targetClimbers.push(score.climber_id);
      });
      targetClimbers = Climbers.find({
        _id: { $in: targetClimbers },
      }).fetch();


      const map = { _id: 'climber_id' };
      targetClimbers.forEach((climber, index, array) => {
        const truncatedDoc = _.pick(climber, ['_id', 'climber_name']);
        const mappedDoc = {};

        _.each(truncatedDoc, (value, key) => {
          const newkey = map[key] || key;
          mappedDoc[newkey] = value;
        });

        array[index] = mappedDoc;
      });


      const scoreOutput = [];
      targetScores
        .fetch()
        .forEach((scoreDoc) => {
          for (let i = targetClimbers.length - 1; i >= 0; i--) {
            if (scoreDoc.climber_id === targetClimbers[i].climber_id) {
              const allScores = [];

              // TODO: For Richard's live stream. Review later.
              const c = Categories.findOne(scoreDoc.category_id);
              const scoreSystem = getScoreSystem(c.score_system);
              // End

              for (let j = scoreDoc.scores.length - 1; j >= 0; j--) {
                const singleScore = {};
                singleScore.marker_id = scoreDoc.marker_id;
                singleScore.category_id = scoreDoc.category_id;
                singleScore.route_id = scoreDoc.scores[j].route_id;
                singleScore.score = scoreDoc.scores[j].score_string;


                // TODO: For Richard's live stream. Review later.
                singleScore.displayString = scoreSystem
                                              .calculate(scoreDoc.scores[j]
                                                                 .score_string)
                                              .displayString;
                // End

                if (options.route_id) {
                  if (options.route_id === singleScore.route_id) {
                    allScores.push(singleScore);
                  }
                } else {
                  allScores.push(singleScore);
                }
              }

              targetClimbers[i].scores = allScores;

              // TODO: For Richard's live stream.
              const ts = scoreSystem.tabulate(scoreDoc.scores);
              let displayString;
              if (c.score_system === scoreSystemsNames[0]) {
                displayString = `${ts.T}T${ts.T_attempts} `
                              + `${ts.B}B${ts.B_attempts}`;
              } else if (c.score_system === scoreSystemsNames[1]) {
                displayString = `${ts.T}T ${ts.F}F ${ts.B}B ${ts.b}b`;
              } else {
                displayString = '';
              }
              targetClimbers[i].totalScore = displayString;


              scoreOutput.push(targetClimbers[i]);
            }
          }
        });

      return {
        statusCode: 200,
        body: { climber_scores: scoreOutput },
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/score/:route_id/:marker_id', {
  authRequired: true,
  // roleRequired: CRIMP.roles.judges,
}, {
  post: function postScore() {
    CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const options = this.urlParams;
      const scoreString = this.bodyParams.score_string;

      /**
       * TODO: Implement the magic sequencing with sequential token
       */

      let targetScore = Scores.find({
        marker_id: options.marker_id,
        scores: { $elemMatch: {
          route_id: options.route_id,
        } },
      });

      // If 0 targetScore is found, it is an invalid request.
      // We assume that route_id is always correct, because it is handle
      // by the app. Hence, the issue is a wrong marker_id caused human
      // error when it was key into the app.
      // We'll try to capture this error score, by attaching it to a dummy
      // Climber and creating the Scores, so that it can be reviewed later
      if (targetScore.count() === 0) {
        const categoryId = Categories.findOne({
          routes: { $elemMatch: {
            _id: options.route_id,
          } },
        })._id;
        const climberId = Climbers.insert({
          climber_name: 'NEW CLIMBER (?)',
          identity: '',
          affliation: '',
          gender: '-',
          categories: [],
        });

        Categories.methods.addClimber.call({
          climberId,
          categoryId,
          markerId: options.marker_id,
        });

        targetScore = Scores.find({
          marker_id: options.marker_id,
          scores: { $elemMatch: {
            route_id: options.route_id,
          } },
        });
      }

      if (targetScore.count() > 1) {
        throw new Meteor.Error('SelectedMultipleScoresForUpdate');
      }

      // There will only be 1 Score document fetched
      targetScore = targetScore.fetch()[0];

      // Find the Score of the target Route
      const scoreDoc = _.find(targetScore.scores,
                              (doc) => (doc.route_id === options.route_id));

      // Append latest Score to the existing String
      const newScoreString = `${scoreDoc.score_string}${scoreString}`;


      Scores.update({
        marker_id: options.marker_id,
        'scores.route_id': options.route_id,
      }, {
        $set: {
          'scores.$.score_string': newScoreString,
        },
      });

      // Non-critical collection used to monitor Score updates
      // Added callback so it doesn't cause an error or delay
      const targetCategory = Categories.findOne({
        routes: { $elemMatch: {
          _id: options.route_id,
        } },
      });
      const targetRoute = _.find(targetCategory.routes,
                                 (route) => (route._id === options.route_id));

      RecentScores.insert({
        route_id: options.route_id,
        route_name: targetRoute.route_name,
        user_id: this.userId,
        user_name: this.user.profile.name,
        marker_id: options.marker_id,
        score_string: newScoreString,
      }, () => {});


      return {
        statusCode: 200,
        body: {
          climber_id: targetScore.climber_id,
          category_id: targetScore.category_id,
          route_id: options.route_id,
          marker_id: targetScore.marker_id,
          score: newScoreString,
        },
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/helpme', {
  authRequired: true,
  // roleRequired: CRIMP.roles.judges,
}, {
  post: function postHelpMe() {
    CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const targetRouteId = this.bodyParams.route_id;
      const helpMeDoc = {
        route_id: targetRouteId,
        route_name: '',
        category_name: '',
        user_id: this.userId,
        user_name: this.user.services.facebook.name,
      };

      if (targetRouteId) {
        const targetCategory = Categories.findOne({
          routes: { $elemMatch: {
            _id: targetRouteId,
          } },
        });
        const targetRoute = _.find(targetCategory.routes,
                                   (route) => (route._id === targetRouteId));

        helpMeDoc.route_name = targetRoute.route_name;
        helpMeDoc.category_name = targetCategory.category_name;
      }

      // Add a dummy callback function so the op does not block
      HelpMe.insert(helpMeDoc, () => {});

      return {
        statusCode: 200,
        body: {},
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/report', {
  authRequired: true,
  // roleRequired: CRIMP.roles.judges,
}, {
  post: function postReport() {
    CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const options = this.bodyParams;
      const targetActive = ActiveTracker.findOne({ route_id: options.route_id });

      if (targetActive
          && options.force !== 'true') {
        return {
          statusCode: 200,
          body: {
            'X-User-Id': targetActive.user_id,
            user_name: targetActive.user_name,
            category_id: targetActive.category_id,
            route_id: targetActive.route_id,
          },
        };
      }

      const targetCategory = Categories.findOne({
        // category_id: options.category_id,
        routes: { $elemMatch: {
          _id: options.route_id,
        } },
      });

      const targetRoute = _.find(targetCategory.routes,
                               (route) => (route._id === options.route_id));

      // Add a dummy callback function so the op does not block
      ActiveTracker.upsert({
        route_id: options.route_id,
      }, { $set: {
        route_id: options.route_id,
        route_name: targetRoute.route_name,
        category_id: targetCategory._id,
        category_name: targetCategory.category_name,
        user_id: this.userId,
        user_name: this.user.services.facebook.name,
      } }, () => {});

      return {
        statusCode: 200,
        body: {
          'X-User-Id': this.userId,
          user_name: this.user.services.facebook.name,
          category_id: targetCategory._id,
          route_id: options.route_id,
        },
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/active', {
  authRequired: false,
  // roleRequired: CRIMP.roles.judges,
}, {
  get: function getActive() {
    return ActiveTracker.find({}).fetch();
  },
});


Api.addRoute('judge/setactive', {
  authRequired: true,
  // roleRequired: CRIMP.roles.judges,
}, {
  put: function putSetActive() {
    CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const options = this.bodyParams;
      const targetActive = ActiveTracker.findOne({
        route_id: options.route_id,
      });
      const targetScore = Scores.findOne({
        marker_id: options.marker_id,
        scores: { $elemMatch: { route_id: options.route_id } },
      });
      const targetClimber = Climbers.findOne({ _id: targetScore.climber_id });

      if (targetActive) {
        // Existing ActiveTracker. Include an update of the judge name to
        // ensure that it is current
        ActiveTracker.update({
          route_id: options.route_id,
        }, { $set: {
          user_id: this.userId,
          user_name: this.user.services.facebook.name,
          climber_id: targetScore.climber_id,
          marker_id: targetScore.marker_id,
          climber_name: targetClimber.climber_name,
        } }, () => {});
      } else {
        // No existing ActiveTracker. Possibly that the timer deleted it.
        // Hence, we would recreate the ActiveTracker document.
        const targetCategory = Categories.findOne({
          routes: { $elemMatch: {
            _id: options.route_id,
          } },
        });

        const targetRoute = _.find(targetCategory.routes,
                                 (route) => (route._id === options.route_id));

        // Add a dummy callback function so the op does not block
        ActiveTracker.insert({
          route_id: targetRoute._id,
          route_name: targetRoute.route_name,
          category_id: targetCategory._id,
          category_name: targetCategory.category_name,
          user_id: this.userId,
          user_name: this.user.services.facebook.name,
          climber_id: targetScore.climber_id,
          marker_id: targetScore.marker_id,
          climber_name: targetClimber.climber_name,
        }, () => {});
      }

      return {
        statusCode: 200,
        body: {},
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});


Api.addRoute('judge/clearactive', {
  authRequired: true,
  // roleRequired: CRIMP.roles.judges,
}, {
  put: function putClearActive() {
    CRIMP.checkRoles(CRIMP.roles.judges, this.user);

    try {
      const options = this.bodyParams;
      const targetActive = ActiveTracker.findOne({ route_id: options.route_id });

      if (targetActive) {
        // Existing ActiveTracker. Include an update of the judge name to
        // ensure that it is current
        ActiveTracker.update({
          route_id: options.route_id,
        }, { $set: {
          user_id: this.userId,
          user_name: this.user.services.facebook.name,
          climber_id: '',
          marker_id: '',
          climber_name: '',
        } }, {
          removeEmptyStrings: false,
        }, () => {});
      } else {
        // No existing ActiveTracker. Possible that the timer deleted it.
        // Hence, we would recreate the ActiveTracker document.
        const targetCategory = Categories.findOne({
          routes: { $elemMatch: {
            _id: options.route_id,
          } },
        });

        const targetRoute = _.find(targetCategory.routes,
                                 (route) => (route._id === options.route_id));

        // Add a dummy callback function so the op does not block
        ActiveTracker.insert({
          route_id: targetRoute._id,
          route_name: targetRoute.route_name,
          category_id: targetCategory._id,
          category_name: targetCategory.category_name,
          user_id: this.userId,
          user_name: this.user.services.facebook.name,
        }, () => {});
      }

      return {
        statusCode: 200,
        body: {},
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: { error: e },
      };
    }
  },
});
