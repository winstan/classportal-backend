import * as chai from 'chai';
import * as supertest from 'supertest';
import { app } from '../../server';
import { logger } from '../../utils/logger';
import { expect, assert } from 'chai';




const CLASS_LIST_PATH = __dirname.replace('/build/test/routes', '') + '/test/assets/mockDataCList.csv';
const COURSE_DATA = {
  courseId : Math.floor(Math.random() * 99999),
  name : 'Computer Studies',
  minTeamSize : '1',
  maxTeamSize : '9',
  modules : new Array(),
  customData : {},
  icon: '//cdn.ubc.ca/clf/7.0.5/img/favicon.ico',
  studentsSetTeams : 1,
  admins : ['fred', 'jimmy'],
};
let studentAgent = function() {
  let studentAgent = supertest.agent(app);

  studentAgent
    .get('/auth/login')
    .query({ username: 'thekitsch', snum: 5 })
    .end((err, res) => {
      // user should be authenticated with session state
      if (err) {
        console.log(err);
      }
    });

  return studentAgent;
};


describe('PUT admin/:courseId', () => {

  const ERROR_RESULT = { err: 'Course validation failed' };
  const SUCCESS_RESULT = { response: 'Successfully added Course #' + COURSE_DATA.courseId };
  const ALREADY_EXISTS = { err: 'Course ' + COURSE_DATA.courseId + ' already exists' };

  it('should return a successfully added course # response', (done) => {
    studentAgent()
      .put('/admin/' + COURSE_DATA.courseId )
      .send(COURSE_DATA)
      .end((err: any, res: supertest.Response) => {
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESULT));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should result in an error because schema fails', (done) => {
    let randomNum = Math.floor(Math.random() * 99999);
    studentAgent()
      .put('/admin/' + randomNum )
      .send({ classList: 'not an array. faulty data' })
      .end((err: any, res: supertest.Response) => {
        expect(res.status).to.equal(500);
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ERROR_RESULT));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });


  it('should return a course # already exists response', (done) => {
    studentAgent()
      .put('/admin/' + COURSE_DATA.courseId )
      .send(COURSE_DATA)
      .end((err: any, res: supertest.Response) => {
        expect(res.status).to.equal(500);
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ALREADY_EXISTS));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });
});

describe('PUT /:courseId/admin/students', () => {
  let invalidNum = Math.floor(Math.random() * 9999956);
  const ERROR_RESULT = { err: 'Course #' + invalidNum +
    ' does not exist. Cannot add class list to course that does not exist.' };
  const SUCCESS_RESULT = { response: 'Successfully updated Class List on course #' + COURSE_DATA.courseId };

  it('should return a successfully added class list response', (done) => {
    studentAgent()
      .post('/' + COURSE_DATA.courseId + '/admin/students')
      .attach('classList', CLASS_LIST_PATH)
      .end((err, res) => {
        expect(res.status).to.equal(200);
        expect(JSON.stringify(res.body)).to.equal(JSON.stringify(SUCCESS_RESULT));
        if (err) {
          console.log(err);
          done(err);
        } else {
          done();
        }
      });
  });

  it('should return an error response as class number does not exist', (done) => {
    studentAgent()
      .post('/' + invalidNum + '/admin/students')
      .attach('classList', CLASS_LIST_PATH)
      .end((err, res) => {
        if (err) {
          console.log(err);
          done(err);
        } else {
          expect(JSON.stringify(res.body)).to.equal(JSON.stringify(ERROR_RESULT));
          done();
        }
      });
  });
});


