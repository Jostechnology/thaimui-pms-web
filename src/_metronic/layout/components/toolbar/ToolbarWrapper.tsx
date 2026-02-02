import clsx from 'clsx'
import { useLayout} from '../../core'


const ToolbarWrapper = () => {
  const {config, classes} = useLayout()
  if (!config.app?.toolbar?.display) {
    return null
  }

  

  return (
    <div
      id='kt_app_toolbar'
      className={clsx('app-toolbar', classes.toolbar.join(' '), config?.app?.toolbar?.class)}
    >
      
    </div>
  )
}



export {ToolbarWrapper}
