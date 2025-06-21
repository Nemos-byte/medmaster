import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

export const ProfileAvatar = ({ 
  src, 
  alt, 
  name, 
  size = 'md', 
  style 
}) => {
  const getSize = () => {
    switch (size) {
      case 'sm':
        return 32;
      case 'lg':
        return 64;
      default:
        return 48;
    }
  };

  const avatarSize = getSize();

  return (
    <View style={[styles.container, style]}>
      {src ? (
        <Image 
          source={{ uri: src }} 
          style={[styles.avatar, { width: avatarSize, height: avatarSize }]}
        />
      ) : (
        <View style={[styles.avatar, styles.placeholder, { width: avatarSize, height: avatarSize }]}>
          <Text style={[styles.initials, { fontSize: avatarSize * 0.4 }]}>
            {name ? name.split(' ').map(n => n[0]).join('') : 'U'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#E5E7EB', // gray-200
  },
  placeholder: {
    backgroundColor: '#7C3AED', // purple-600
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
}); 