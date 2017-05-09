import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';

interface ITeamDocument extends mongoose.Document {
  course: Object;
  teamId: number;
  members: Object[];
  deliverable: Object;
  name: string;
  githubUrl: string;
  TAs: Object[];
}

interface ITeamModel extends mongoose.Model<ITeamDocument> {
  findByUsername(username: string): Promise<ITeamDocument>;
  findOrCreate(query: Object): Promise<ITeamDocument>;
}

const TeamSchema = new mongoose.Schema({
  teamId: {
    type: Number,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  githubUrl: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
    required: true,
  },
  deliverable: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Deliverable',
    required: true,
  },
  members: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    required: true,
  },
  TAs: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  org: {
    type: String,
    default: null,
  },
});

// Methods
TeamSchema.method({
});

// Statics
TeamSchema.static({
  /**
  * Find a team by object ID. If does not exist, then team is created in DB.
  * @param {object} recommended courseId
  * @returns {Promise<ITeamDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<ITeamDocument> => {
    return Team
      .findOne(query)
      .exec()
      .then((team) => {
        if (team !== null) {
          return Promise.resolve(team);
        } else {
          return Team.create(query)
            .then((q) => { return q.save(); })
            .catch((err) => { logger.info(err); });
        }
      });
  },
});

const Team: ITeamModel = <ITeamModel>mongoose.model('Team', TeamSchema);

export { ITeamDocument, ITeamModel, Team };
