import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { Course, ICourseDocument } from '../models/course.model';
import { Deliverable, IDeliverableDocument } from '../models/deliverable.model';
import { User, IUserDocument } from '../models/user.model';
import { Grade, IGradeDocument } from '../models/grade.model';

function create(payload: any) {
  logger.info('create() in Grades Controller');
  let course: ICourseDocument;
  let gradesArray = new Array();
  let getCourse = Course.findOne({ courseId : payload.courseId }).populate('grades classList').exec();

  // Adds Grades to Course object if they do not exist without deleting previous array contents.
  let addGradesToCourse = function(newGrades: [any]) {
    return getCourse.then( c => {
      return c;
    })
    .then( c => {
      for (let key in newGrades) {
        Course.findOne({ 'courseId' : payload.courseId }).populate({
          path: 'courses classList',
          match: { _id : newGrades[key]._id },
        })
        .exec()
        .then( c => {
          let isInArray = c.grades.some( function(grade: IGradeDocument) {
            return grade._id !== newGrades[key]._id;
          });
          if (!isInArray) {
            c.grades.push(newGrades[key]);
          }
          return c.save();
        })
        .catch(err => logger.info(err));
      }
      return c.save();
    });
  };

  let findOrCreateGrades = Promise.all(payload.grades.map( (g: IGradeDocument) => {
    return Grade.createOrUpdate(g)
      .then( newOrUpdatedGrade => {
        return newOrUpdatedGrade;
      })
      .catch(err => logger.info(err));
  }))
  .then( (newGrades) => {
    addGradesToCourse(newGrades);
  })
  .catch(err => logger.info(err));
  return Course.findOne({ courseId : payload.courseId }).populate('grades').exec();
}

function getAllGradesByCourse(courseId: string) {
  logger.info('getGradesAdmin()');
  return Course.findOne({ 'courseId' : courseId }).populate('grades').exec();
}

function getReleasedGradesByCourse(req: any) {
  logger.info('getReleasedGradesBycourse()');
  let gradesInCourse = Course.findOne({ 'courseId' : req.params.courseId }).populate('grades').exec();

  let getReleasedDeliverables = Deliverable.find({ gradesReleased: true })
  .exec()
  .then( deliverables => {
    let deliverableNames = new Array();
    console.log('this is them ' + deliverables);
    for ( let key in deliverables ) {
      console.log(deliverables[key]);
      if (deliverables[key].gradesReleased === true) {
        console.log(deliverables[key].name);
        deliverableNames.push(deliverables[key].name);
      }
    }
    return deliverableNames;
  })
  .catch(err => logger.info(err));

  return getReleasedDeliverables.then( (deliverableNames: IDeliverableDocument[]) => {
    let snum = req.user.snum;
    return Grade.find({
      'snum' : snum,
      'deliv' : { $in: deliverableNames },
    }).exec();
  });

  // let getReleasedGrades = getReleasedDeliverables
  //   .then( deliverableNames => {
  //     gradesInCourse.then( c => {
  //       for (let key in c.grades) {
  //         let isReleased = deliverableNames.some
  //       }
  //     })
  //   })
}

function update(req: restify.Request, res: restify.Response, next: restify.Next) {
  logger.info('update grades');
  res.json(200, 'update grades');
  return next();
}


export { update, getAllGradesByCourse, getReleasedGradesByCourse, create }
