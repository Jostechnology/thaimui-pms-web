// import { toAbsoluteUrl } from '../../../../_metronic/helpers'
import { AuthLayout } from '../AuthLayout'
import {Route, Routes} from 'react-router-dom'
import EnvConfig from "../../../environments/envConfig";
import josLogo from '../../../assets/Artboard 1jos trademark colors.png';

const env = new EnvConfig();

function AccessDenied() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="*" element={(
          <div className='d-flex flex-column flex-root'>
            <div className='d-flex flex-column flex-center text-center p-10'>
              <h1 className='text-gray-900 fw-bolder mb-5'>Access Denied</h1>
              <div className='text-gray-500 fw-semibold fs-6 mb-10'>
                You do not have permission to view this page.
              </div>
              {/* <img
                alt='Access Denied'
                src={toAbsoluteUrl('media/illustrations/sketchy-1/18.png')}
                className='mw-100 mb-10 h-200px'
              /> */}
              <img src={josLogo} style={{width: "300px", height: "300px"}}/>
              <button 
                type="submit" 
                className='btn btn-primary'
                onClick={() => window.location.href = `${env.login_page}`}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}/>
        </Route>
    </Routes>
  )
}

export default AccessDenied;