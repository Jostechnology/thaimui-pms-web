import {KTIcon} from '../../../helpers'
import { useNavigate } from 'react-router-dom'

const SidebarFooter = () => {

  const navigate = useNavigate();

  return (
    <div className='app-sidebar-footer flex-column-auto pt-2 pb-6 px-6' id='kt_app_sidebar_footer'>
      <button
        type='button'
        className='btn btn-flex flex-center btn-custom btn-primary overflow-hidden text-nowrap px-0 h-40px w-100'
        data-bs-toggle='tooltip'
        data-bs-trigger='hover'
        data-bs-dismiss-='click'
        title='Metronic Docs & Components'
        onClick={() => navigate('setting/')}
      >
        <span className='btn-label'>Setting</span>
        <KTIcon iconName='document' className='btn-icon fs-2 m-0' />
      </button>
    </div>
  )
}

export {SidebarFooter}