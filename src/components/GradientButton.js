import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect } from 'react-native-svg';

export const GradientButton = ({
  onPress,
  children,
  title,
  style,
  textStyle,
  disabled = false,
  activeOpacity = 0.8,
}) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const onLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== layout.width || height !== layout.height)) {
      setLayout({ width, height });
    }
  };

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const borderRadius = flattenedStyle.borderRadius !== undefined ? flattenedStyle.borderRadius : 24;

  return (
    <TouchableOpacity
      style={[styles.btn, style, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      onLayout={onLayout}
    >
      {layout.width > 0 && layout.height > 0 && (
        <Svg
          height={layout.height}
          width={layout.width}
          style={StyleSheet.absoluteFillObject}
        >
          <Defs>
            <SvgGradient id={`btnGrad_${Math.round(layout.width)}_${Math.round(layout.height)}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#84CD4D" stopOpacity="1" />
              <Stop offset="100%" stopColor="#138235" stopOpacity="1" />
            </SvgGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            rx={borderRadius}
            ry={borderRadius}
            fill={`url(#btnGrad_${Math.round(layout.width)}_${Math.round(layout.height)})`}
          />
        </Svg>
      )}
      {title ? <Text style={[styles.text, textStyle]}>{title}</Text> : children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#138235',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default GradientButton;
