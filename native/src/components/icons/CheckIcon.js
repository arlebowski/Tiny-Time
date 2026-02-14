import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web/icons.js Check (stroke-based)
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Path d="M20 6 9 17l-5-5" />
  </Svg>
);
