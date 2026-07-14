import { useRef, useState } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { extractErrorMessage } from '@/services/api/client';
import { useTheme } from '@/theme';
import { useBulkMarkAttendance } from '../hooks';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// QR payload contract: the student's ID card QR encodes the raw student _id
// as plain text. Marking still goes through the same bulk-attendance endpoint
// the class roster screen uses — the scanner is just a fast way to pick a
// student, never a local source of truth for attendance.
export function QrScanScreen() {
  const { colors, spacing, typography } = useTheme();
  const params = useLocalSearchParams<{ class: string; section: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const bulkMark = useBulkMarkAttendance();
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const lockRef = useRef(false);

  const klass = params.class ?? '';
  const section = params.section ?? '';

  const handleScan = async ({ data }: { data: string }) => {
    if (lockRef.current || data === lastScanned) return;
    lockRef.current = true;
    setLastScanned(data);
    setFeedback(null);

    try {
      await bulkMark.mutateAsync({
        class: klass,
        section,
        date: todayIso(),
        records: [{ studentId: data.trim(), status: 'present' }],
      });
      setFeedback('Marked present');
    } catch (err) {
      setFeedback(extractErrorMessage(err));
    } finally {
      setTimeout(() => {
        lockRef.current = false;
      }, 1500);
    }
  };

  if (!klass || !section) {
    return (
      <ScreenContainer scroll={false}>
        <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xl }]}>
          Go back and select a class and section first.
        </Text>
        <View style={{ marginTop: spacing.lg }}>
          <Button label="Back" onPress={() => router.back()} variant="secondary" />
        </View>
      </ScreenContainer>
    );
  }

  if (!permission) {
    return <ScreenContainer scroll={false}><View /></ScreenContainer>;
  }

  if (!permission.granted) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.permission}>
          <Text style={[typography.subheading, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
            Camera access needed
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg }]}>
            SchoolOS needs camera access to scan student QR codes for attendance.
          </Text>
          <Button label="Grant access" onPress={requestPermission} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView style={styles.flex} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={handleScan} />
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <Text style={[typography.bodyStrong, { color: '#fff', textAlign: 'center' }]}>
          {klass} · {section}
        </Text>
        {feedback ? (
          <Text style={[typography.body, { color: '#fff', textAlign: 'center', marginTop: spacing.xs }]}>{feedback}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 24, paddingHorizontal: 16 },
});
