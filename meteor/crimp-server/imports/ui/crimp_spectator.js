import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import Events from '../data/events';

import './conn_status.js';
import './activetracker.js';
import './scoreboard.js';
import './crimp_spectator.html';


Meteor.subscribe('eventsToAll');


Template.crimp_spectator.helpers({
  event: () => Events.findOne({}),
});
