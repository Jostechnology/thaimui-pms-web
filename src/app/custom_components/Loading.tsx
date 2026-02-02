interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const TarnLoading: React.FC<LoadingProps> = ({ 
  message = "Loading...", 
  size = 'md' 
}) => {
  const spinnerSizeClass = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border spinner-border-lg'
  }[size];

  return (
    <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light">
      <div className="text-center">
        <div 
          className={`spinner-border text-primary mb-3 ${spinnerSizeClass}`} 
          role="status"
          style={{ width: size === 'lg' ? '3rem' : undefined, height: size === 'lg' ? '3rem' : undefined }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted fs-5 mb-0">{message}</p>
      </div>
    </div>
  );
};