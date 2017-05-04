import * as mongoose from 'mongoose';
import { logger } from '../../utils/logger';

interface IDeliverableDocument extends mongoose.Document {
  courseId: string;
  name: string;
  url: string;
  open: string;
  close: string;
  gradesReleased: Boolean;
}

interface IDeliverableModel extends mongoose.Model<IDeliverableDocument> {
  findOrCreate(query: Object): Promise<IDeliverableDocument>;
}

const DeliverableSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId, ref: 'Course',
  },
  name: {
    type: String,
    unique: true,
  },
  url: {
    type: String,
  },
  open: {
    type: Date,
  },
  close: {
    type: Date,
  },
  gradesReleased: {
    type: Boolean,
  },
});

DeliverableSchema.static({

    /**
  * Find a Deliverable by object query. If doesn't exist, creates it based on object query and returns it.
  * @param {object} search parameters
  * @returns {Promise<IDeliverableDocument>} Returns a Promise of the user.
  */
  findOrCreate: (query: Object): Promise<IDeliverableDocument> => {
    return Deliverable
      .findOne(query)
      .exec()
      .then((deliverable) => {
        if (deliverable) {
          return deliverable;
        } else {
          return Deliverable.create(query)
            .then((q) => {
              return q.save();
            })
            .catch((err) => { logger.info(err); });
        }
      });
  },
});

const Deliverable: IDeliverableModel = <IDeliverableModel>mongoose.model('Deliverable', DeliverableSchema);

export { IDeliverableDocument, IDeliverableModel, Deliverable };
