import { ImportMappingTemplate, IImportMappingTemplate } from './import-mapping-template.model';
import { ImportType } from './import-session.model';

export const importMappingTemplateRepository = {
  /** The auto-remembered mapping for this exact header shape, if any. */
  async findBySignature(schoolId: string, importType: ImportType, headerSignature: string): Promise<IImportMappingTemplate | null> {
    return ImportMappingTemplate.findOne({ schoolId, importType, headerSignature, name: { $exists: false } }).lean<IImportMappingTemplate>();
  },

  /** Remembers/updates the mapping used for this header shape — called after
   *  every successful confirm so the next matching upload reuses it automatically. */
  async rememberMapping(schoolId: string, importType: ImportType, headerSignature: string, mapping: Record<string, string>, createdBy: string): Promise<void> {
    await ImportMappingTemplate.findOneAndUpdate(
      { schoolId, importType, headerSignature, name: { $exists: false } },
      { $set: { mapping, createdBy } },
      { upsert: true },
    );
  },

  async listNamedTemplates(schoolId: string, importType?: ImportType): Promise<IImportMappingTemplate[]> {
    const filter: Record<string, unknown> = { schoolId, name: { $exists: true, $ne: null } };
    if (importType) filter.importType = importType;
    return ImportMappingTemplate.find(filter).sort({ name: 1 }).lean<IImportMappingTemplate[]>();
  },

  async saveNamedTemplate(schoolId: string, importType: ImportType, name: string, mapping: Record<string, string>, createdBy: string): Promise<IImportMappingTemplate> {
    return ImportMappingTemplate.create({
      schoolId,
      importType,
      name,
      headerSignature: '', // named templates aren't shape-matched automatically — applied by explicit user choice
      mapping,
      createdBy,
    });
  },

  async deleteNamedTemplate(id: string, schoolId: string): Promise<boolean> {
    const result = await ImportMappingTemplate.deleteOne({ _id: id, schoolId, name: { $exists: true, $ne: null } });
    return result.deletedCount > 0;
  },
};
