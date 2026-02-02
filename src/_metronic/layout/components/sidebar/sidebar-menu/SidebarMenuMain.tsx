import { SidebarMenuItemWithSub } from './SidebarMenuItemWithSub'
import { SidebarMenuItem } from './SidebarMenuItem'
import { Module, PermissionResponse, TransformedPermission } from '../../../../../app/type_interface/SettingType'
import {
  MainRouteType, SubRouteType, mainRoutesConfig, subRoutesConfig,
  RouteType
} from '../../../../../app/modules/auth/AuthMenu'
import React, { useState, useEffect } from 'react'
// import { getRolePermission } from '../../../../../app/services/settingServices'
import { getEmpId, getRoleId } from '../../../../../app/helpers/appHelpers'
import { useMasterData } from '../../../../../app/context/MasterDataContext'
import { useAlertModal } from '../../../../../app/context/ModalContext'

const SidebarMenuMain = () => {

  const { masterData, setPermissionList, setActionList } = useMasterData();
  const { openAlertModal } = useAlertModal();
  const [isMenuLoading, setIsMenuLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const { permissionList } = masterData;

  //PERMISSION TEMPLATE
  const [dashboardPermission, setDashboardPermission] = useState<TransformedPermission>();
  const [currentMapPermission, setCurrentMapPermission] = useState<TransformedPermission>()
  const [currentDeliveryPermission, setCurrentDeliveryPermission] = useState<TransformedPermission>()

  // const getPermission = async () => {
  //   const adminPermissions = await getModulePermissions("DASHBOARD", "DASHBOARD_MAIN");
  //   setDashboardPermission(adminPermissions);
  // };

  // useEffect(() => {
  //   getPermission()
  // }, [dashboardPermission])

  // const intl = useIntl()

  const fetchPermissionList = async () => {
    setIsMenuLoading(true);
    try {
      
    } catch (e) {
      console.error(e);
      console.log("fetchPermissionList returns error.");
    } finally {
      // setIsMenuLoading(false);
    }
  }

  useEffect(() => {
      fetchPermissionList();
  }, [masterData.updatePermission])

  // ------------------------ อย่าเพิ่ม PATH ตรงนี้ หรือถ้าเพิ่มเพื่อเทส icon อย่าลืมลบก่อน PUSH ด้วยนะครับบบบบบ ------------------------
  // ------------------------------------------------ จาก DEV ผู้อดหลับอดนอน -----------------------------------------------

  return (
    <>
      {
        isMenuLoading ?

          <div className='menu-item'>
            <div className='menu-content pt-8 pb-2'>
              <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Loading....</span>
            </div>
          </div>
          : isError ?
            <div className='menu-item'>
              <div className='menu-content pt-8 pb-2'>
                <span className='menu-section text-muted text-uppercase fs-8 ls-1'>An error occurs while loading.</span>
              </div>
            </div>
            :
            <React.Fragment>
              {dashboardPermission?.view &&
                // <SidebarMenuItem to='/dashboard' icon='element-11' title={intl.formatMessage({ id: 'MENU.DASHBOARD' })} fontIcon='bi-app-indicator' />
                <SidebarMenuItem to='/dashboard' icon='element-11' title={"Dashboard"} fontIcon='bi-app-indicator' />
              }
              {currentMapPermission?.view &&
                <SidebarMenuItem to='/current_map' icon='eye' title={"ติดตามรถ"} fontIcon='bi-app-indicator' />
              }
              {currentDeliveryPermission?.view &&
                <SidebarMenuItem to='/dashboard_delivery_location' icon='map' title={"ติตตามการจัดส่ง"} fontIcon='bi-app-indicator' />
              }
              {/* <SidebarMenuItem to='/work_plans' icon='switch' title='แผนงาน' fontIcon='bi-layers' /> */}

              <div className='menu-item'>
                <div className='menu-content pt-8 pb-2'>
                  <span className='menu-section text-muted text-uppercase fs-8 ls-1'>Menu</span>
                </div>
              </div>

              {
                permissionList.map((menu, index) => {
                  return (
                    <SidebarMenuItemWithSub
                      key={`${menu.title}-${index}`}
                      to={menu.path}
                      title={menu.title}
                      fontIcon={menu.fontIcon}
                      icon={menu.icon}>
                      {
                        menu.subMenu.map((sub_menu, s_index) => {
                          return (
                            <SidebarMenuItem
                              key={`${sub_menu.title}-${s_index}`}
                              to={sub_menu.path}
                              title={sub_menu.title}
                              hasBullet={true} />
                          );
                        })
                      }
                    </SidebarMenuItemWithSub>
                  );
                })
              }
            </React.Fragment>
      }
    </>
  )
}

export { SidebarMenuMain }