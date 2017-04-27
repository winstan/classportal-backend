import { logger } from '../utils/logger';
import { User, IUserDocument } from '../app/models/user.model';
import { Team, ITeamDocument } from '../app/models/team.model';
import { Deliverable, IDeliverableDocument } from '../app/models/deliverable.model';
import { Course, ICourseDocument } from '../app/models/course.model';
import { config } from '../config/env';
import { app } from '../config/restify';
import * as server from '../server';

let course710: ICourseDocument;
let course610: ICourseDocument;
let child_tables: any;

const data = {

  users: [
    { 'csid' : 'a1a1', 'snum' : '1', 'lname' : 'Alast', 'fname' : 'Afirst',
      'username' : 'rodney', 'courses' : new Array(), 'teamUrl' : '' },
    { 'csid' : 'b2b1', 'snum' : '2', 'lname' : 'Blast', 'fname' : 'Bfirst',
      'username' : 'bodney', 'courses' : new Array(), 'teamUrl' : '' },
    { 'csid' : 'c3c1', 'snum' : '3', 'lname' : 'Clast', 'fname' : 'Cfirst',
      'username' : 'codney', 'courses' : new Array(), 'teamUrl' : '' },
    { 'csid' : 'e5e5', 'snum' : '5', 'lname' : 'Elast', 'fname' : 'Efirst',
      'username' : 'eodney', 'courses' : new Array(), 'teamUrl' : ''},
    { 'csid' : '12312321', 'snum' : '5', 'lname' : 'Smith', 'fname' : 'Thomas',
      'username' : 'thekitsch', 'courses' : new Array() },
    { 'csid' : '999999222', 'snum' : '83', 'lname' : 'Smith', 'fname' : 'Cynthia',
      'username' : 'TEST_ADMIN_1', 'courses' : new Array() },
  ],

  courses: [
    { 'courseId' : '710', 'minTeamSize' : 1, 'maxTeamSize' : 8, 'customData' : '{}',
      'studentsSetTeams' : true, 'admins' : [['fred', 'jimmy']], 'grades' : new Array(),
      'deliverables' : new Array(), 'classList' : new Array(), 'modules' : new Array(),
      'icon' : '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico', 'name' : '' },
    { 'courseId' : '610', 'minTeamSize' : 2, 'maxTeamSize' : 10, 'customData' : '{}',
      'studentsSetTeams' : true, 'admins' : [['kim', 'cindy']], 'grades' : new Array(),
      'deliverables' : new Array(), 'classList' : new Array(), 'modules' : new Array(),
      'icon' : '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico', 'name' : '' },
    { 'courseId' : '510', 'minTeamSize' : 4, 'maxTeamSize' : 20, 'customData' : '{}',
      'studentsSetTeams' : true, 'admins' : [['george', 'jimmy']], 'grades' : new Array(),
      'deliverables' : new Array(), 'classList' : new Array(), 'modules' : new Array(),
      'icon' : '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico', 'name' : '' },
    { 'courseId' : '410', 'minTeamSize' : 1, 'maxTeamSize' : 4, 'customData' : '{}',
      'studentsSetTeams' : false, 'admins' : [['george', 'jimmy']], 'grades' : new Array(),
      'deliverables' : new Array(), 'classList' : new Array(), 'modules' : new Array(),
      'icon' : '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico', 'name' : '' },
  ],

};

function getChildTables() {
  console.log(course610);
  console.log(course710);
  child_tables = {
    deliverables: [
      { 'name' : 'Assignment 1', 'gradesReleased' : true, 'open' : '1970-01-18T02:21:07.200Z',
        'close' : '1970-01-18T04:01:55.200Z', 'url' : 'http://github.com/assignment1',
        'courseId' : course710._id,
      },
      { 'name' : 'Assignment 2', 'gradesReleased' : false, 'open' : '1999-01-18T02:21:07.200Z',
        'close' : '2000-01-18T04:01:55.200Z', 'url' : 'http://github.com/assignment2',
        'courseId' : course610._id,
      },
    ],
  };
}


server.onConnect.then( connection => {
  clearUsers();
  clearTeams();
  clearCourses();
  seedUsers();
  seedCourses().then(() => {
    getQueries()
    .then( (courseQueries: any) => {
      course610 = courseQueries[0];
      course710 = courseQueries[1];
    })
    .then(() => {
      getChildTables();
    }).then(() => {
      seedDeliverables();
    });
  });
  return;
});

function getQueries() {
  let query1 = Course.findOne({ 'courseId' : '610' }).exec()
    .then(c => {
      return c;
    })
    .catch(err => { console.log(err); });
  let query2 = Course.findOne({ 'courseId' : '710' }).exec()
    .then(c => {
      return c;
    })
    .catch(err => { console.log(err); });
  return Promise.all([query1, query2])
    .catch(err => { console.log(err); });
}

function clearUsers() {
  User.remove({}).exec();
}

function clearTeams() {
  Team.remove({}).exec();
}

function clearCourses() {
  Course.remove({}).exec();
}

function seedUsers(): Promise<IUserDocument[]> {
  logger.info('Verifying that users exist in db:');

  if (data.users.length < 1) {
    return Promise.reject(new Error('Error: No users specified in data.users!'));
  } else {
    // get users
    let usersArray = data.users;
    logger.info(usersArray.map((user: any) => user.fname));

    // write all users to db
    const promises: Promise<IUserDocument>[] = usersArray.map((current: any) => {
      const newUser: IUserDocument = new User({
        username: current.username,
        lname: current.lname,
        fname: current.fname,
        csid: current.csid,
        snum: current.snum,
        courses: current.courses,
        teamUrl: current.teamUrl,
      });
      return newUser
        .save();
    });

    return Promise.all(promises);
  }
}

function seedCourses(): Promise<ICourseDocument[]> {
  logger.info('Verifying that courses exist in db:');

  if (data.courses.length < 1) {
    return Promise.reject(new Error('Error: No users specified in data.users!'));
  } else {
    // get courses
    let coursesArray = data.courses;
    logger.info(coursesArray.map((course: any) => course.courseId));

    // write all courses to db
    const promises: Promise<ICourseDocument>[] = coursesArray.map((current: any) => {
      const newCourse: ICourseDocument = new Course({
        courseId: current.courseId,
        minTeamSize: current.minTeamSize,
        maxTeamSize: current.maxTeamSize,
      });
      return newCourse
        .save()
        .catch(err => { console.log(err); });
    });

    return Promise.all(promises);
  }
}


function seedDeliverables(): Promise<IDeliverableDocument[]> {
  logger.info('Verifying that deliverables exist in db:');

  if (child_tables.deliverables.length < 1) {
    return Promise.reject(new Error('Error: No users specified in data.users!'));
  } else {
    // get deliverables
    let deliverablesArray = child_tables.deliverables;
    logger.info(deliverablesArray.map((deliverable: any) => deliverable.deliverableId));

    // write all deliverables to db
    const promises: Promise<IDeliverableDocument>[] = deliverablesArray.map((current: any) => {
      const newDeliverable: IDeliverableDocument = new Deliverable({
        name: current.name,
        gradesReleased: current.gradesReleased,
        open: current.open,
        close: current.close,
        url: current.url,
        courseId: current.courseId,
      });
      return newDeliverable
        .save();
    });

    return Promise.all(promises);
  }
}


export { seedCourses, seedUsers };