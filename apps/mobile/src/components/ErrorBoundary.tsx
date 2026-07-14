import { Component, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Root-level safety net: a render error anywhere below this boundary shows a
// recoverable screen instead of a blank/crashed app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = (): void => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {__DEV__ ? this.state.error.message : "We've hit an unexpected error. Please try again."}
          </Text>
          <View style={styles.action}>
            <Button label="Try again" onPress={this.reset} />
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  message: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  action: { minWidth: 160 },
});
