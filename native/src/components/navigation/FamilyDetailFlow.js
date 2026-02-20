import React from 'react';
import LayeredSubpageContainer from './LayeredSubpageContainer';

export default function FamilyDetailFlow({
  progress,
  width,
  hasStackedSubpage,
  canGoBack,
  edgeSwipeGesture,
  baseContent,
  overlayContent,
}) {
  return (
    <LayeredSubpageContainer
      progress={progress}
      width={width}
      overlayMounted={Boolean(overlayContent)}
      overlayInteractive
      basePointerEvents={hasStackedSubpage ? 'none' : 'auto'}
      edgeSwipeTop={72}
      edgeSwipeGesture={canGoBack ? edgeSwipeGesture : null}
      baseContent={baseContent}
      overlayContent={overlayContent}
    />
  );
}
