import * as restify from 'restify';
import { logger } from '../../utils/logger';
import { ITeamDocument, Team } from '../models/team.model';
import { ICourseDocument, Course } from '../models/course.model';
import { IProjectDocument, Project } from '../models/project.model';
import { IUserDocument, User } from '../models/user.model';
import { IDeliverableDocument, Deliverable } from '../models/deliverable.model';
import GitHubManager, { GroupRepoDescription } from '../github/githubManager';
import * as auth from '../middleware/auth.middleware';
  // const ORG_NAME = 'CS310-2016Fall';
  const ORG_NAME = 'CPSC310-2017W-T2';

  // all projects will start with this (e.g., cpsc310project_team12)
  const PROJECT_PREFIX = 'cpsc310project_team';

  // all teams will start with this (e.g., cpsc310_team12)
  const TEAM_PREFIX = 'cpsc310_team';

  // the team containing all of the TAs
  const STAFF_TEAM = 'staff';

  // if we want to delete projects instead of creating them. be careful with this!
  const CLEAN = false;
  
function getRepos(orgName: string): Promise<[Object]> {
  let githubManager = new GitHubManager(orgName);
  return githubManager.getRepos(orgName);
}

function createGithubTeam(payload: any): Promise<number> {
  let githubManager = new GitHubManager(payload.orgName);
  return githubManager.createTeam(payload.teamName, payload.permission)
    .then( (newTeam) => {
      return githubManager.addMembersToTeam(newTeam.teamId, payload.members);
    });
}

function deleteRepos(payload: any): Promise<[string]> {
  let githubManager = new GitHubManager(payload.orgName);

  return Promise.all([payload.repoNames.map( (name: string) => {
    return githubManager.deleteRepo(name);
  })]);
}

function createTeamName(course: ICourseDocument, delivName: string, teamNum: string) {
  const CPSC_PREPENDAGE = 'cpsc';
  let courseSettings = course.settings;

  if (courseSettings.markDelivsByBatch) {
    let teamName = `${CPSC_PREPENDAGE}${course.courseId}_${teamNum}`;
    return teamName;
  }
  else {
    let teamName = `${CPSC_PREPENDAGE}${course.courseId}_${delivName}_${teamNum}`;
    return teamName;
  }
}

function createGithubReposForTeams(payload: any): Promise<any> {

  const ADMIN = 'admin';
  const PULL = 'pull';
  const PUSH = 'push';

  let githubManager = new GitHubManager(payload.githubOrg);
  let course: ICourseDocument;
  let courseSettings: any;
  let teams: ITeamDocument[];
  let team: ITeamDocument;
  let inputGroup: GroupRepoDescription;
  let deliverable: IDeliverableDocument;
  let courseWebhook: string;

  return Course.findOne({ courseId: payload.courseId }).exec()
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        courseSettings = _course.settings;
      } else { throw `Could not find course ${payload.courseId}`; }
      return _course;
    })
    .then((_course: ICourseDocument) => {
      return Deliverable.findOne({ courseId: _course._id, name: payload.deliverableName })
        .then((deliv: IDeliverableDocument) => {
          if (deliv) {
            return deliv;
          }
          else { throw `Could not find Deliverable ${payload.deliverableName} under 
            Course ${_course.courseId}`; }
        })
        .catch(err => {
          logger.error(`GithubController:createGithubReposForTeams() ERROR ${err}`);
        });
    })
    .then((deliv: IDeliverableDocument) => {

      // IMPORTANT NOTE: Two Types of Teams Can Be Built.
      // Team type #1: Build teams where all deliverables are in one repo
      // Team type #2: Build teams where each deliverable is in individual 
      // respective repo.
      //
      // courseSettings contains markByBatch bool to change configuration.
      // Configuration cannot change after Teams have been built.

      if (courseSettings.markDelivsByBatch) {
        return getTeamsToBuildByBatch(course)
          .then((teams: ITeamDocument[]) => {
            return buildTeamsByBatch(teams);
          })
          .catch(err => {
            logger.error(`GithubController::getTeamsToBuildByBatch()/buildByBatch() ERROR ${err}`);
          });
      } else {
        return getTeamsToBuildForSelectedDeliv(course, deliv)
          .then((teams: ITeamDocument[]) => {
            return buildTeamsForSelectedDeliv(teams);
          })
          .catch(err => {
            logger.error(`GithubController::getTeamsToBuildForSelectedDeliv()/
              buildTeamsForSelectedDeliv() ERROR ${err}`);
          });
      }
    });

    function buildTeamsForSelectedDeliv(_teams: ITeamDocument[]) {
      for (let i = 0; i < _teams.length; i++) {
        let inputGroup = {
          teamName: createTeamName(course, payload.deliverableName, _teams[i].name),
          members: ['steca', 'autotest-01'],
          projectName: createTeamName(course, payload.deliverableName, _teams[i].name),
          teamIndex: i,
          team: _teams[i].name,
          _team: _teams[i],
          orgName: course.githubOrg
        };
        githubManager.completeTeamProvision(inputGroup, deliverable.url, STAFF_TEAM, course.urlWebhook);
      }
    }

    function buildTeamsByBatch(_teams: ITeamDocument[]) {
      for (let i = 0; i < _teams.length; i++) {
        let inputGroup = {
          teamName: createTeamName(course, payload.deliverableName, _teams[i].name),
          members: ['steca', 'autotest-01'],
          projectName: createTeamName(course, payload.deliverableName, _teams[i].name),
          teamIndex: i,
          team: _teams[i].name,
          _team: _teams[i],
          orgName: course.githubOrg
        };
        githubManager.completeTeamProvision(inputGroup, course.batchImportUrl, STAFF_TEAM, course.urlWebhook);
      }
    }

    function getTeamsToBuildByBatch(course: ICourseDocument) {
      return Team.find({ courseId: course._id })
        .populate({ path: 'members' })
        .exec()
        .then((_teams: any) => {
          if (_teams.length == 0) {
            throw `No Teams found. Must add teams before you can build Repos.`;
          }
          teams = _teams;
          return _teams;
        })
        .catch(err => {
          logger.error(`Github.Controller::getTeamsToBuild() ERROR ${err}`);
        });
        
    }

    function getTeamsToBuildForSelectedDeliv(course: ICourseDocument, deliv: IDeliverableDocument) {
      return Team.find({ courseId: course._id, deliverableId: deliv._id })
        .populate({ path: 'members deliverableId' })
        .exec()
        .then((_teams: ITeamDocument[]) => {
          if (_teams) {
            teams = _teams;
            return teams;
          }
          throw `Deliverable ${deliv.name} not found under Course ${course.courseId}.`;
        })
        .catch(err => {
          logger.error(`Github.Controller::getTeamsToBuildForSelectedDiv() ERROR ${err}`);
        });
    }
}

function createGithubReposForProjects(payload: any): Promise<any> {

  const ADMIN = 'admin';
  const PULL = 'pull';
  const PUSH = 'push';

  let githubManager = new GitHubManager(payload.githubOrg);
  let course: ICourseDocument;
  let courseSettings: any;
  let projects: IProjectDocument[];
  let project: IProjectDocument;
  let inputGroup: GroupRepoDescription;
  let deliverable: IDeliverableDocument;

  return Course.findOne({ courseId: payload.courseId }).exec()
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        courseSettings = _course.settings;
      } else { throw `Could not find course ${payload.courseId}`; }
      return _course;
    })
    .then((_course: ICourseDocument) => {
      return Deliverable.findOne({ courseId: _course._id, name: payload.deliverableName })
        .then((deliv: IDeliverableDocument) => {
          if (deliv) {
            deliverable = deliv;
            return deliv;
          }
          else { throw `Could not find Deliverable ${payload.deliverableName} under 
            Course ${_course.courseId}`; }
        })
        .catch(err => {
          logger.error(`GithubController:createGithubReposForProjects() ERROR ${err}`);
        });
    })
    .then((deliv: IDeliverableDocument) => {

      // IMPORTANT NOTE: Two Types of Teams Can Be Built.
      // Team type #1: Build teams where all deliverables are in one repo
      // Team type #2: Build teams where each deliverable is in individual 
      // respective repo.
      //
      // courseSettings contains markByBatch bool to change configuration.
      // Configuration cannot change after Teams have been built.

      if (courseSettings.markDelivsByBatch) {
        throw `Cannot build projects for Batch Team course`;
      } 
      return getProjectsToBuildForSelectedDeliv(course, deliv)
        .then((projects: IProjectDocument[]) => {
          return buildProjectsForSelectedDeliv(projects);
        })
        .catch(err => {
          logger.error(`GithubController::getProjectsToBuildForSelectedDeliv()/
             ERROR ${err}`);
        });
    });

    function buildProjectsForSelectedDeliv(_projects: IProjectDocument[]) {
      console.log('did we make it here then?');
      for (let i = 0; i < _projects.length; i++) {
        let inputGroup = {
          repoName: createTeamName(course, payload.deliverableName, _projects[i].name),
          projectName: createTeamName(course, payload.deliverableName, _projects[i].name),
          projectIndex: i,
          student: _projects[i].student.username,
          project: _projects[i],
          projects: _projects,
          orgName: course.githubOrg
        };
        githubManager.completeIndividualProvision(inputGroup, deliverable.url, STAFF_TEAM, course.urlWebhook);
      }
    }

    function getProjectsToBuildForSelectedDeliv(course: ICourseDocument, deliv: IDeliverableDocument) {
      return Project.find({ courseId: course._id, deliverableId: deliv._id })
        .populate({ path: 'student deliverableId courseId' })
        .exec()
        .then((_projects: IProjectDocument[]) => {
          if (_projects) {
            projects = _projects;
            return projects;
          }
          throw `Deliverable ${deliv.name} not found under Course ${course.courseId}.`;
        })
        .catch(err => {
          logger.error(`Github.Controller::getProjectsToBuildForSelectedDiv() ERROR ${err}`);
        });
    }
}

function getTeams(payload: any) {
  return Course.findOne({ courseId: payload.courseId })
    .exec()
    .then( c => {
      return Team.find({ course: c._id })
      .select('teamId githubUrl TAs name members deliverable')
      .populate({
        path: 'TAs',
        select: 'fname lname csid snum -_id',
      })
      .populate({
        path: 'deliverable',
        select: 'name url open close -_id',
      })
      .populate({
        path: 'members',
        select: 'fname lname csid snum -_id',
      })
      .exec();
    });
}

export { getTeams, createGithubTeam, createGithubReposForTeams, createGithubReposForProjects,
        getRepos, deleteRepos };