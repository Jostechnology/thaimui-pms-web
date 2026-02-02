
import {useEffect} from 'react'
import {Outlet, Link} from 'react-router-dom'
import {toAbsoluteUrl} from '../../../_metronic/helpers'
import josLogo from '../../assets/Artboard 1jos trademark colors2.png';

const AuthLayout = () => {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      root.style.height = '100%'
    }
    return () => {
      if (root) {
        root.style.height = 'auto'
      }
    }
  }, [])

  return (
    <div className='d-flex flex-column flex-lg-row flex-column-fluid h-100'
      style={{backgroundColor: "grey"}}>
      <div className='d-flex flex-column flex-lg-row-fluid w-lg-50 p-10 order-2 order-lg-1'>
        <div className='d-flex flex-center flex-column flex-lg-row-fluid'>
          <div className='w-lg-500px p-10' style={{
            backgroundColor: "white", borderRadius: "5px",
            boxShadow: "2px 2px 1px 1px white"
          }}>
            <Outlet />
          </div>
        </div>

        <div className='d-flex flex-center flex-wrap px-5'>
        </div>
      </div>
      {/* <div
        className='d-flex flex-lg-row-fluid w-lg-50 bgi-size-cover bgi-position-center order-1 order-lg-2 justify-content-center align-items-center'
        style={{backgroundColor: 'grey'}}
      >
        <div
          className='d-flex justify-content-center align-items-center'
          style={{
            width: "220px", height: "220px", backgroundColor: "white",
            borderRadius: '5px',
            boxShadow: "2px 2px 2px 2px white" 
          }}>
          <img src={josLogo} style={{width: "200px", height: "200px"}}/>
        </div>
      </div> */}
    </div>
  )
}

export {AuthLayout}
