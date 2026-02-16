import React from 'react';
import Svg, { Path } from 'react-native-svg';

// 1:1 from web/icons.js Edit2 (stroke-based)
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </Svg>
);
