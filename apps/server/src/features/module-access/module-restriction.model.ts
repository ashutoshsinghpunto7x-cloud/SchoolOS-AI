import mongoose, { Document, Schema } from 'mongoose';

// One document per module key (see MODULE_CATALOG in @schoolos/types). A
// module with no document is unrestricted — restriction is opt-in per key,
// unlike the feature-flags collection which defaults new flags to hidden.
// This is deliberately a separate, small collection rather than reusing the
// Feature model: the two systems have opposite default semantics (feature
// flags gate unfinished work behind an allow-list; this temporarily pauses
// already-shipped modules) and mixing them risked one accidentally
// influencing the other's evaluation.
export interface IModuleRestriction extends Document {
  moduleKey: string;
  restricted: boolean;
  message?: string;
  returnAt?: Date;
  showReturnTime: boolean;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const moduleRestrictionSchema = new Schema<IModuleRestriction>(
  {
    moduleKey: { type: String, required: true, unique: true, trim: true },
    restricted: { type: Boolean, default: false },
    message: { type: String, trim: true, maxlength: 300 },
    returnAt: { type: Date },
    showReturnTime: { type: Boolean, default: false },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const ModuleRestriction = mongoose.model<IModuleRestriction>('ModuleRestriction', moduleRestrictionSchema);
