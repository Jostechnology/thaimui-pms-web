export function getCurrentUrl(pathname: string) {
  return pathname.split(/[?#]/)[0]
}

export function checkIsActive(pathname: string, url: string) {
  const current = getCurrentUrl(pathname)
  if (!current || !url) {
    return false
  }

  if (current === url) {
    return true
  }

  // Use segment-based matching instead of substring matching
  // This prevents /pm/maintenance_order from matching /pm/maintenance_order_status
  const currentSegments = current.split('/')
  const urlSegments = url.split('/')
  
  // Check if url segments match the beginning of current segments
  if (urlSegments.length <= currentSegments.length) {
    const isMatch = urlSegments.every((segment, index) => segment === currentSegments[index])
    if (isMatch && urlSegments.length < currentSegments.length) {
      return true
    }
  }

  return false
}
