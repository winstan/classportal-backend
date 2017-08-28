import * as restify from 'restify';
import * as routeHandler from './routeHandler';
import * as auth from './auth';
import { isAuthenticated, adminAuthenticated, superAuthenticated,
   adminOrProfAuthenticated } from '../../app/middleware/auth.middleware';
import { passport } from '../../config/auth';
import { config } from '../../config/env';

const routes = (server: restify.Server) => {
  // Accessible by anyone
  server.get('/ping', routeHandler.pong);
  server.get('/courses', isAuthenticated, routeHandler.getAllCourses);
  server.get('/myCourses', isAuthenticated, routeHandler.getMyCourses);
  server.get('/:courseId/labSections', isAuthenticated, routeHandler.getLabSectionsFromCourse);
  server.get('/:courseId/:labId/labList', isAuthenticated, routeHandler.getCourseLabSectionList);
  server.get('/test', isAuthenticated, routeHandler.testRoute);
  server.get('/isAuthenticated', routeHandler.isAuthenticated);
  server.get('/currentUser', isAuthenticated, routeHandler.getCurrentUser);
  server.get('/:courseId/deliverables', isAuthenticated, routeHandler.getDeliverables);
  server.get('/:courseId/grades', isAuthenticated, routeHandler.getGradesStudent);
  server.get('/:courseId/students/withoutTeam', routeHandler.getUsersNotOnTeam);
  server.put('/register', isAuthenticated, routeHandler.validateRegistration);
  server.get('/:courseId/:userId/teams', isAuthenticated, routeHandler.getCourseTeamsPerUser);
  server.put('/:courseId/team', routeHandler.createTeam);
  server.get('/:courseId/students', isAuthenticated, routeHandler.getStudentNamesFromCourse);
  // OAuth routes by logged-in users only
  server.put('/register/username', isAuthenticated, routeHandler.addGithubUsername);
  server.post('/logout', auth.loadUser, routeHandler.logout);
  server.get('/auth/login', passport.authenticate(config.auth_strategy), routeHandler.getCurrentUserInfo);
  server.get('/auth/login/return', passport.authenticate(config.auth_strategy, { failureRedirect: '/failed' }),
    ( req: any, res: any, next: restify.Next) => {
      res.redirect('https://localhost:3000/postLogin', next);
    });

  // Authenticated routes

  // -- Prof or Admin Routes
  server.post('/:courseId/admin/admins', /* adminOrProfAuthenticated, */ routeHandler.addAdmins);
  server.get('/:courseId/admin/admins', routeHandler.getAllAdmins);
  server.get('/:courseId/admin/teams', routeHandler.getTeams);
  server.get('/:courseId/admin/courseSettings', routeHandler.getCourseSettings);
  server.post('/admin/classList', routeHandler.getClassList);

  // -- Admin or Super Admin Only Routes
  server.put('/:courseId/admin/github/team', routeHandler.createGithubTeam);
  server.put('/:courseId/admin/github/repo/team', routeHandler.createGithubReposForTeams);
  server.put('/:courseId/admin/github/repo/user', routeHandler.createGithubReposForProjects);
  server.post('/:courseId/admin/teamGeneration', routeHandler.randomlyGenerateTeamsPerCourse);
  server.get('/:courseId/admin/github/repos/:orgName', routeHandler.getRepos);
  server.del('/:courseId/admin/github/repos/:orgName', routeHandler.deleteRepos);
  server.put('/admin/:courseId', routeHandler.createCourse);
  server.post('/:courseId/admin/team', routeHandler.updateTeam);
  server.get('/:courseId/admin/students', adminAuthenticated, routeHandler.getClassList);
  server.post('/:courseId/admin/students', routeHandler.addStudentList);
  server.post('/:courseId/admin/labList', routeHandler.addLabList);
  server.post('/:courseId/admin/grades', routeHandler.addGrades);
  server.get('/:courseId/admin/grades', routeHandler.getGradesAdmin);
  server.post('/:courseId/admin/grades/:delivId', routeHandler.addGradesCSV);
  server.post('/:courseId/admin/deliverable', routeHandler.updateDeliverable);
  server.put('/:courseId/admin/deliverable', routeHandler.addDeliverable);
  server.get('/settings', isAuthenticated, routeHandler.getCurrentUserInfo);
  server.get('/logout', isAuthenticated, routeHandler.logout);
};

export { routes };