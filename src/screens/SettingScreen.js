import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
  Share,
  Alert,
} from 'react-native';

import { useLanguage } from '../context/LanguageContext';

// SVG Icons from setting folder
import GlobeIcon from '../assets/setting/globe_asia.svg';
import SecurityIcon from '../assets/setting/security.svg';
import ShareIcon from '../assets/setting/share.svg';
import StarIcon from '../assets/setting/family_star.svg';
import InfoIcon from '../assets/setting/info.svg';
import ChevronRightIcon from '../assets/setting/arrow_back_ios_new.svg';
import BackArrowIcon from '../assets/keyboard_arrow_left.svg';

const LANGUAGES = [
  { code: 'en', name: 'English (Default)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ur', name: 'Urdu (اردو)' },
  { code: 'ar', name: 'Arabic (العربية)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
];

export const SettingScreen = ({ navigation }) => {
  const { t, currentLanguage, changeLanguage } = useLanguage();
  const [activeModal, setActiveModal] = useState(null); // 'language', 'privacy', 'rate', 'about'
  const [rating, setRating] = useState(5);

  const SETTINGS_OPTIONS = [
    {
      id: 'language',
      title: t('language'),
      Icon: GlobeIcon,
    },
    {
      id: 'privacy_policy',
      title: t('privacyPolicy'),
      Icon: SecurityIcon,
    },
    {
      id: 'share_with_friends',
      title: t('shareWithFriends'),
      Icon: ShareIcon,
    },
    {
      id: 'rate_us',
      title: t('rateUs'),
      Icon: StarIcon,
    },
    {
      id: 'about',
      title: t('about'),
      Icon: InfoIcon,
    },
  ];

  const handleOptionPress = (optionId) => {
    switch (optionId) {
      case 'language':
        setActiveModal('language');
        break;
      case 'privacy_policy':
        setActiveModal('privacy');
        break;
      case 'share_with_friends':
        handleShareApp();
        break;
      case 'rate_us':
        setActiveModal('rate');
        break;
      case 'about':
        setActiveModal('about');
        break;
      default:
        break;
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Zip Reader & Converter',
        message:
          'Check out Zip Reader & Converter app to compress, extract, and manage your zip archives effortlessly!\n\nDownload now: https://play.google.com/store/apps/details?id=com.zipreader.converter',
      });
    } catch (error) {
      console.log('Share error:', error.message);
    }
  };

  const handleRatingSubmit = () => {
    Alert.alert(t('thankYou'), t('ratingThankYou'));
    setActiveModal(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackArrowIcon width={24} height={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('setting')}</Text>
        </View>

        {/* Setting Options List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {SETTINGS_OPTIONS.map((item) => {
            const IconComponent = item.Icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleOptionPress(item.id)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.iconWrapper}>
                    <IconComponent width={24} height={24} />
                  </View>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>

                <View style={styles.cardRight}>
                  <ChevronRightIcon width={16} height={16} />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Language Modal */}
      <Modal
        visible={activeModal === 'language'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.modalOptionRow}
                onPress={async () => {
                  setActiveModal(null);
                  await changeLanguage(lang.code);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Splash' }],
                  });
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    currentLanguage === lang.code && styles.modalOptionTextSelected,
                  ]}
                >
                  {lang.name}
                </Text>
                {currentLanguage === lang.code && (
                  <Text style={styles.checkmarkText}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={activeModal === 'privacy'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContentLarge} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeaderRow}>
              <SecurityIcon width={24} height={24} />
              <Text style={styles.modalTitleInline}>{t('privacyPolicy')}</Text>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalBodyText}>
                {t('privacyPolicyContent')}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeBtnText}>{t('iUnderstand')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rate Us Modal */}
      <Modal
        visible={activeModal === 'rate'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <StarIcon width={36} height={36} style={styles.centerIcon} />
            <Text style={[styles.modalTitle, { textAlign: 'center', marginTop: 10 }]}>
              {t('enjoyingZipApp')}
            </Text>
            <Text style={[styles.modalBodyText, { textAlign: 'center', marginBottom: 20 }]}>
              {t('tapStarToRate')}
            </Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((starVal) => (
                <TouchableOpacity
                  key={starVal}
                  onPress={() => setRating(starVal)}
                  style={styles.starTouch}
                >
                  <Text style={[styles.starChar, starVal <= rating && styles.starActive]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleRatingSubmit}
            >
              <Text style={styles.submitBtnText}>{t('submitRating')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={activeModal === 'about'}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActiveModal(null)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <InfoIcon width={36} height={36} style={styles.centerIcon} />
            <Text style={[styles.modalTitle, { textAlign: 'center', marginTop: 10 }]}>
              Zip Reader & Converter
            </Text>
            <Text style={[styles.modalBodyText, { textAlign: 'center', marginVertical: 10 }]}>
              {t('version')}
            </Text>
            <Text style={[styles.modalBodyText, { textAlign: 'center', color: '#666666' }]}>
              {t('aboutContent')}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { marginTop: 20 }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeBtnText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E1E1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F3F5',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginLeft: 14,
  },
  cardRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalContentLarge: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleInline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E1E1E',
    marginLeft: 10,
  },
  modalOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#009A3E',
    fontWeight: '700',
  },
  checkmarkText: {
    fontSize: 16,
    color: '#009A3E',
    fontWeight: '700',
  },
  modalBodyText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 22,
  },
  boldText: {
    fontWeight: '700',
    color: '#1E1E1E',
  },
  modalScroll: {
    marginBottom: 16,
  },
  closeBtn: {
    backgroundColor: '#009A3E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  centerIcon: {
    alignSelf: 'center',
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  starTouch: {
    paddingHorizontal: 8,
  },
  starChar: {
    fontSize: 34,
    color: '#D1D5DB',
  },
  starActive: {
    color: '#FFB800',
  },
  submitBtn: {
    backgroundColor: '#009A3E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SettingScreen;
