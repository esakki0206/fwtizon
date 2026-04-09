import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { FiAlertCircle } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error strictly caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <Card className="max-w-md w-full border-red-100 dark:border-red-900 shadow-xl shadow-red-500/10">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-8 h-8 text-red-600 dark:text-red-500" />
              </div>
              <CardTitle className="text-2xl text-gray-900 dark:text-white">Something went wrong</CardTitle>
              <CardDescription className="text-base">
                An unexpected error has crashed this section of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col space-y-4">
               <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-500 dark:text-gray-400 font-mono overflow-auto max-h-32">
                 {this.state.error && this.state.error.toString()}
               </div>
               <Button onClick={() => window.location.reload()} className="w-full" size="lg">
                 Reload Application
               </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
