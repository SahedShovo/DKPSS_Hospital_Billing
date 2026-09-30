interface AlertProps {
  type?: 'error' | 'success' | 'info';
  message: string;
}

export function Alert({ type = 'error', message }: AlertProps) {
  const styles = {
    error: 'bg-red-50 text-red-700',
    success: 'bg-green-50 text-green-700',
    info: 'bg-blue-50 text-blue-700',
  };
  return <div className={`rounded-md px-3 py-2 text-sm ${styles[type]}`}>{message}</div>;
}