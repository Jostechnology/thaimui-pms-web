import { TransformedPermission } from "../type_interface/SettingType";

export const getUserAction = (
  actionList: any[],
  main_module_code: string,
  module_code: string
): TransformedPermission => {

  const module = actionList.find(
    (m) =>
      m.main_module_code === main_module_code &&
      m.module_code === module_code
  );

  const permission = module?.permission ?? [];

  return {
    create: permission.includes("create"),
    edit: permission.includes("edit"),
    delete: permission.includes("delete"),
    view: permission.includes("view"),
  };
};
