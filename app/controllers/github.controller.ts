import * as restify from 'restify';
import {logger} from '../../utils/logger';
import {ITeamDocument, Team} from '../models/team.model';
import {ICourseDocument, Course} from '../models/course.model';
import {IProjectDocument, Project} from '../models/project.model';
import {IUserDocument, User} from '../models/user.model';
import {IDeliverableDocument, Deliverable} from '../models/deliverable.model';
import db from '../db/MongoDBClient';
import GitHubManager, {GroupRepoDescription} from '../github/githubManager';
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

/**
 * 
 * @param payload.courseId string number on Course object ie. '310'
 * @param payload.deliverableName string name on Deliverable object ie.'d1'
 * @param payload.githubOrg string nae on Course object ie. 'CPSC210-2017W-T2'
 * @return void
 */
function getProjectHealthReport(payload: any) {
  let reposInOrg: any;
  let projects: any;
  let course: ICourseDocument;
  let deliv: IDeliverableDocument;
  let report: any = new Object();
  let reposUnderDeliv: any = [];

  const DELIVERABLE_NAME = payload.deliverableName.toString();

    return Course.findOne({courseId: payload.courseId})
      .then((_course: ICourseDocument) => {
        if (_course) {
          course = _course;
          return _course;
        }
        throw `Course not found`;
    })
    .then((course: ICourseDocument) => {
      return getRepos(course.githubOrg)
      .then((_reposInOrg: [Object]) => {
        reposInOrg = _reposInOrg;
        return _reposInOrg;
      });
    })
    .then(() => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliv = _deliv;
            return deliv;
          }
          throw `Could not find Deliverable ${payload.deliverableName} under ${course.courseId}`;
        })
        .catch(err => {
          logger.error(`CourseController::Deliverable.findOne ERROR ${err}`);
        });
    })
    .then(() => {
      return Project.find({courseId: course._id, deliverableId: deliv._id})
        .then((_projects: IProjectDocument[]) => {
          console.log('courseID: ', course._id);
          console.log('deliverableId', deliv._id);
          if (_projects) {
            console.log('projects', projects);
            projects = _projects;

            // get Github repos that have name containing deliverableName flag
            Object.keys(reposInOrg).forEach((key: any) => {
              let searchString = '_' + DELIVERABLE_NAME + '_';
              let repoName = reposInOrg[key].name.toString();
              if (repoName.indexOf(searchString) > -1) {
                reposUnderDeliv.push(reposInOrg[key]);
              }
            });

            report.info = {
              name:        `PROJECT HEALTH CHECK for ${payload.deliverableName} and ${payload.courseId}`,
              deliverable: payload.deliverableName,
              courseNum:   payload.courseId,
            };

            // get Project numbers that exist under DelivName and Course
            report.numberOfProjects = getNumberOfProjects();
            report.repoNames = reposUnderDeliv.map((repo: any) => {
              return repo.name;
            });
            report.projectNames = projects.map((project: IProjectDocument) => {
              return project.name;
            });

            // get report Number of Repos with Deliv from Github
            report.numberOfCreatedRepos = getNumberOfGithubRepos();
            let collaborators: any = [];
            for (let i = 0; i < reposUnderDeliv.length; i++) {
              getCollaborators(reposUnderDeliv[i].name, payload.orgNa)
                .then((result: any) => {
                  collaborators.push(result);
                });
            }
            return report;
            // return report;
          }
          throw `Could not find Projects under ${course.courseId} and ${deliv.name}`;
        })
        .catch(err => {
          logger.error(`CourseController::Project.find ERROR ${err}`);
        });
    })
    .catch(err => {
      logger.error(`GithubController::fixGithubReposForProjects ERROR ${err}`);
    });


  function checkIfRepoCreated() {

  }

  function getNumberOfGithubRepos(): Number {
    return reposUnderDeliv.length;
  }

  function getNumberOfProjects(): Number {
    return projects.length;
  }

  function getCollaborators(repoName: string, orgName: string): Promise<any> {
    let githubManager = new GitHubManager(orgName);
    return githubManager.getCollaboratorsFromRepo(repoName)
      .then((result: any) => {
        return result;
      });
  }
}

function getRepos(orgName: string): Promise<[Object]> {
  let githubManager = new GitHubManager(orgName);
  return githubManager.getRepos(orgName);
}

function createGithubTeam(payload: any): Promise<number> {
  let githubManager = new GitHubManager(payload.orgName);
  return githubManager.createTeam(payload.teamName, payload.permission)
    .then((newTeam) => {
      return githubManager.addMembersToTeam(newTeam.teamId, payload.members);
    });
}

function deleteRepos(payload: any): Promise<[string]> {
  let githubManager = new GitHubManager(payload.orgName);

  return Promise.all([payload.repoNames.map((name: string) => {
    return githubManager.deleteRepo(name);
  })]);
}

function createRepoName(course: ICourseDocument, delivName: string, teamNum: string) {

  let teamName = `${delivName}_${teamNum}`;
  return teamName;
}

/** 
 * @param payload.courseId = number, ie. 310
 * @param payload.githubOrg = string, ie. "CPSC310-2017W-T2"
 * @param payload.deliverableName = string, ie. "d0"
 * @console.log output usernames that fail to be added at end of script. // UNIMPLEMENTED
 *  */
function repairGithubReposForTeams(payload: any): Promise<any> {
  let course: ICourseDocument;
  let teams: ITeamDocument[];
  let deliverable: IDeliverableDocument;
  let githubManager: GitHubManager;
  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      course = _course;
      if (course) {
        githubManager = new GitHubManager(course.githubOrg);
        return _course;
      } else {
        throw `Could not find course ${payload.courseId}`;
      }
    })
    .then(() => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliverable = _deliv;
            return;
          } else {
            throw `Could not find deliverable ${payload.deliverableName} with ${payload.courseId}`;
          }
        });
    })
    .then(() => {
      return Team.find({courseId: course._id, deliverableIds: deliverable._id}).populate({path: 'members'}).then((_teams: ITeamDocument[]) => {
        for (let i = 0; i < _teams.length; i++) {
          let inputGroup = {
            teamName:    'name',
            members:     _teams[i].members.map((user: IUserDocument) => {
              return user.username;
            }),
            projectName: payload.deliverableName + '_' + _teams[i].name,
            teamIndex:   i,
            team:        _teams[i].name,
            _team:       _teams[i],
            orgName:     'CPSC310-2017W-T1'
          };
          githubManager.reAddUsersToTeam(inputGroup, inputGroup.projectName, STAFF_TEAM, '');
        }
      });
    })
    .catch(err => {
      logger.error(`GithubController::repairGithubReposForTeams ERROR ${err}`);
    });
}

/**
 * @param payload.courseId course id ie. '310'
 * @param payload.deliverableName The name of the Deliverable ie. 'd1', 'pn2'
 * @return string "Succesfully created 200 message"
 */
function createGithubReposForTeams(payload: any): Promise<any> {

  let githubManager: GitHubManager;
  let course: ICourseDocument;
  let courseSettings: any;
  let teams: ITeamDocument[];
  let team: ITeamDocument;
  let buildByBatch: boolean;
  let inputGroup: GroupRepoDescription;
  let deliverable: IDeliverableDocument;

  if (typeof payload.buildByBatch !== 'undefined') {
    buildByBatch = true;
  }

  return Course.findOne({courseId: payload.courseId}).exec()
    .then((_course: ICourseDocument) => {
      if (_course) {
        githubManager = new GitHubManager(_course.githubOrg);
        course = _course;
        courseSettings = _course.settings;
      } else {
        throw `Could not find course ${payload.courseId}`;
      }
      return _course;
    })
    .then((_course: ICourseDocument) => {
      return Deliverable.findOne({courseId: _course._id, name: payload.deliverableName})
        .then((deliv: IDeliverableDocument) => {
          if (deliv) {
            deliverable = deliv;
            return deliv;
          }
          else {
            throw `Could not find Deliverable ${payload.deliverableName} under 
            Course ${_course.courseId}`;
          }
        })
        .catch(err => {
          logger.error(`GithubController:createGithubReposForTeams() ERROR ${err}`);
        });
    })
    .then((deliv: IDeliverableDocument) => {

        return getTeamsToBuildForSelectedDeliv(course, deliv)
          .then((teams: ITeamDocument[]) => {
            return buildTeamsForSelectedDeliv(teams);
          })
          .catch(err => {
            logger.error(`GithubController::getTeamsToBuildForSelectedDeliv()/ buildTeamsForSelectedDeliv() ERROR ${err}`);
          });
    });

  function buildTeamsForSelectedDeliv(_teams: ITeamDocument[]) {
    for (let i = 0; i < _teams.length; i++) {
      console.log('teams output', _teams[i].members);
      let inputGroup = {
        teamName:    createRepoName(course, payload.deliverableName, _teams[i].name),
        members:     _teams[i].members.map((user: IUserDocument) => {
          return user.username;
        }),
        projectName: payload.deliverableName + '_' + _teams[i].name,
        teamIndex:   i,
        team:        _teams[i].name,
        _team:       _teams[i],
        orgName:     course.githubOrg
      };
      githubManager.completeTeamProvision(inputGroup, deliverable.url, STAFF_TEAM, course.urlWebhook);
    }
  }

  function getTeamsToBuildByBatch(course: ICourseDocument) {
    return Team.find({courseId: course._id, $where: 'this.disbanded !== true',
      'githubState.repo.url': ''})
      .populate({path: 'members'})
      .exec()
      .then((_teams: any) => {
        if (_teams.length == 0) {
          throw `No Teams found. Must add teams before you can build Repos.`;
        }
        console.log('teams found', teams);
        teams = _teams;
        return _teams;
      })
      .catch(err => {
        logger.error(`Github.Controller::getTeamsToBuild() ERROR ${err}`);
      });

  }

  function getTeamsToBuildForSelectedDeliv(course: ICourseDocument, deliv: IDeliverableDocument) {
    return Team.find({courseId: course._id, deliverableIds: deliv._id, 
      $where: 'this.disbanded !== true', 'githubState.repo.url': ''})
      .populate({path: 'members deliverableId'})
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

/**
 * Removes the Github Repo information that is placed in a Team object on the basis of a Deliverable.
 * This allows one to delete repos manually in Github and then re-provision the Repos without needing 
 * to re-create the Teams.
 * 
 * @param payload.courseId string course id ie. '310'
 * @param deliverableName string ie. 'd1', 'project6'
 */
function removeReposFromTeams(payload: any): Promise<object> {
  let course: ICourseDocument;
  let deliv: IDeliverableDocument;
  const TEAMS_COLLECTION = 'teams';

  return Course.findOne({courseId: payload.courseId})
    .then((_course: ICourseDocument) => {
      if (_course) {
        course = _course;
        return course;
      }
      throw `Cannot find Course under ${payload.courseId}`;
    })
    .then((course: ICourseDocument) => {
      return Deliverable.findOne({courseId: course._id, name: payload.deliverableName})
        .then((_deliv: IDeliverableDocument) => {
          if (_deliv) {
            deliv = _deliv;
            return deliv;
          }
          throw `Cannot find Deliverable under ${payload.courseId} and ${payload.deliverableName}`;
        });
    })
    .then((deliv: IDeliverableDocument) => {
      return db.updateMany(TEAMS_COLLECTION, {deliverableIds: deliv._id}, {$set: {'githubState.repo.url': ''}})
        .then((result: object) => {
          return result;
        });
    });
}

function getTeams(payload: any) {
  return Course.findOne({courseId: payload.courseId})
    .exec()
    .then(c => {
      return Team.find({course: c._id})
        .select('teamId githubUrl TAs name members deliverable')
        .populate({
          path:   'TAs',
          select: 'fname lname csid snum -_id',
        })
        .populate({
          path:   'deliverable',
          select: 'name url open close -_id',
        })
        .populate({
          path:   'members',
          select: 'fname lname csid snum -_id',
        })
        .exec();
    });
}

export {
  getTeams, createGithubTeam, createGithubReposForTeams, removeReposFromTeams,
  getRepos, deleteRepos, getProjectHealthReport, repairGithubReposForTeams
};
