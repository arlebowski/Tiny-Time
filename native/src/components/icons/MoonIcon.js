import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Moon icon for dark mode toggle (Phosphor style, matching codebase)
export default ({ size = 24, color = '#000', ...props }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color} {...props}>
    <Path d="M233.54,142.23a8,8,0,0,0-8-2,88.08,88.08,0,0,1-109.8-109.8,8,8,0,0,0-10-10,104.84,104.84,0,0,0-52.91,37A104,104,0,0,0,136,224a103.09,103.09,0,0,0,62.52-20.88,104.84,104.84,0,0,0,37-52.91A8,8,0,0,0,233.54,142.23ZM188.9,190.36A88,88,0,0,1,65.64,67.09,89,89,0,0,1,96,48.11,104.11,104.11,0,0,0,151.89,160a89,89,0,0,1-19,30.36,88.46,88.46,0,0,0,56-0Z" />
  </Svg>
);
