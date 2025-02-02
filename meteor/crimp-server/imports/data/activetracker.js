import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

import CRIMP from '../settings';
// import Categories from './categories';
// import Climbers from './climbers';

const EXPIRY_INTERVAL_JUDGE = 15 * 60 * 1000;
const EXPIRY_INTERVAL_CLIMBER = 8 * 60 * 1000;

const ActiveTracker = new Mongo.Collection('ActiveTracker');
ActiveTracker.schema = new SimpleSchema({
  route_id: {
    type: String,
    index: true,
    unique: true,
  },
  route_name: {
    type: String,
    label: 'Name of route',
  },
  category_id: {
    type: String,
  },
  category_name: {
    type: String,
    label: 'Name of category',
  },
  user_id: {
    type: String,
  },
  user_name: {
    type: String,
    label: 'Name of judge on the route',
  },
  user_expiry: {
    type: Date,
    label: 'Time to delete document',
    // expires in 20mins
    autoValue: () => new Date(Date.now() + EXPIRY_INTERVAL_JUDGE),
  },
  climber_id: {
    type: String,
    defaultValue: '',
  },
  marker_id: {
    type: String,
    defaultValue: '',
    label: 'Marker ID of climber',
  },
  climber_name: {
    type: String,
    label: 'Name of climber',
    defaultValue: '',
  },
  climber_expiry: {
    label: 'Time to remove climber',
    type: Date,
    autoValue: () => new Date(Date.now() + EXPIRY_INTERVAL_CLIMBER),
  },
});
ActiveTracker.attachSchema(ActiveTracker.schema);

// if (CRIMP.ENVIRONMENT.NODE_ENV === 'production') {
//   ActiveTracker.deny({
//     insert() { return true; },
//     update() { return true; },
//     remove() { return true; },
//   });
// }


ActiveTracker.methods = {};
// ActiveTracker.methods.addClimber = new ValidatedMethod({
//   name: 'ActiveTracker.methods.addClimber',
//   validate: new SimpleSchema({
//     routeId: { type: String },
//     climberId: { type: String },
//   }).validator(),
//   run({ routeId, climberId }) {

//   },
// });

// ActiveTracker.methods.removeClimber = new ValidatedMethod({
//   name: 'ActiveTracker.methods.removeClimber',
//   validate: new SimpleSchema({
//     routeId: { type: String },
//     climberId: { type: String },
//   }).validator(),
//   run({ routeId, climberId }) {

//   },
// });

// ActiveTracker.methods.addJudge = new ValidatedMethod({
//   name: 'ActiveTracker.methods.addJudge',
//   validate: new SimpleSchema({
//     routeId: { type: String },
//     userId: { type: String },
//   }).validator(),
//   run({ routeId, userId }) {

//   },
// });

ActiveTracker.methods.removeJudge = new ValidatedMethod({
  name: 'ActiveTracker.methods.removeJudge',
  validate: new SimpleSchema({
    routeId: { type: String },
    userId: { type: String },
  }).validator(),
  run({ routeId, userId }) {
    CRIMP.checkRoles(CRIMP.roles.admins, userId);

    ActiveTracker.remove({
      route_id: routeId,
    });
  },
});


export default ActiveTracker;
