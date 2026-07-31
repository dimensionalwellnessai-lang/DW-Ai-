import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ErrorState } from './ui/StateViews';
import { captureError } from '../services/monitoring';

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = {
    hasError: false,
    message: 'Something went wrong while loading the app.',
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'Something went wrong while loading the app.',
    };
  }

  componentDidCatch(error: Error): void {
    captureError(error, { area: 'app_error_boundary' });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: 'Something went wrong while loading the app.' });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ErrorState
            title="We hit a snag"
            message={this.state.message}
            onRetry={this.handleRetry}
            retryLabel="Try again"
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
