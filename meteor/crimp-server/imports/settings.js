import { Meteor } from 'meteor/meteor';

import { roles, checkRoles } from './roles';

const CRIMP = {
  ENVIRONMENT: {
    /**
     *  Expected values: ['production', 'development']
     *  TODO: Remember to change when pushing to production
     */
    NODE_ENV: 'production',

    /**
     *  Demo mode will automatically set all new users as admins
     */
    DEMO_MODE: false,

    /**
     *  Full name for desktop views
     *  Recommended length: less than sixty characters
     *                 |-----------------this is 50 chars-----------------| */
    COMPANY_NAME_FULL: 'CRIMP Development',

    /**
     *  Shortened name to be displayed on mobile screens
     *  Recommended length: less than 20 characters
     *                  |--this is 20 chars--|    */
    COMPANY_NAME_SHORT: 'CRIMP-dev',
  },

  /**
   *  Utility group and checking function for Roles
   */
  roles,
  checkRoles,
};


/**
 *  Ensure that process.env.NODE_ENV is not falsey
 *  isServer because client-side would die from process.env
 *  being undefined
 */
if (Meteor.isServer && process.env.NODE_ENV) {
  CRIMP.ENVIRONMENT.NODE_ENV = process.env.NODE_ENV;
}

export default CRIMP;
