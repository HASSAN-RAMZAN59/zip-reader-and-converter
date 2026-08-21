import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const CATEGORIES = [
  'Compressed',
  'Extracted',
  'Documents',
  'Videos',
  'Images',
  'Audios',
  'APK',
  'Download',
];

export const HomeScreen = () => {
  const handleCategoryPress = (categoryName) => {
    Alert.alert('Category', `Navigating to ${categoryName}`);
    console.log(`Navigating to ${categoryName}`);
  };

  const handleActionPress = (actionName) => {
    Alert.alert('Action', `Triggered: ${actionName}`);
    console.log(`Triggered: ${actionName}`);
  };

  const renderCategoryCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handleCategoryPress(item)}
    >
      <Text style={styles.cardText} numberOfLines={2}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Categories</Text>
        </View>

        {/* 4x2 Category Grid */}
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={renderCategoryCard}
          numColumns={4}
          scrollEnabled={false}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.row}
        />

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => handleActionPress('Smart Scan Zips')}
          >
            <Text style={styles.actionButtonText}>Smart Scan Zips</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            activeOpacity={0.7}
            onPress={() => handleActionPress('Create New Zip')}
          >
            <Text style={styles.actionButtonText}>Create New Zip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  gridContainer: {
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  card: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
  },
  cardText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 14,
  },
  actionButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default HomeScreen;
