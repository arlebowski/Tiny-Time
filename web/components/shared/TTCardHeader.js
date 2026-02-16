const TTCardHeader = ({
  icon = null,
  title = null,
  subtitle = null,
  right = null,
  showIcon = true,
  showTitle = true,
  align = 'between',
  gapClass = 'gap-2',
  className = '',
  style = null,
  leftClassName = '',
  rightClassName = '',
  titleClassName = 'text-base font-semibold',
  subtitleClassName = 'text-xs',
  titleStyle = null,
  subtitleStyle = null
}) => {
  const hasIcon = showIcon && !!icon;
  const hasTitle = showTitle && title !== null && title !== undefined;
  const hasLeft = hasIcon || hasTitle;
  const justifyClass = align === 'end' ? 'justify-end' : 'justify-between';
  const leftClasses = `flex items-center ${gapClass} ${leftClassName}`.trim();
  const rightClasses = `flex items-center ${rightClassName}`.trim();

  const resolveNode = (node) => {
    if (!node) return null;
    if (React.isValidElement(node)) return node;
    if (typeof node === 'function') return React.createElement(node);
    return node;
  };

  const titleNode = resolveNode(title);
  const subtitleNode = resolveNode(subtitle);
  const iconNode = resolveNode(icon);

  return React.createElement(
    'div',
    { className: `flex items-center w-full ${justifyClass} ${className}`.trim(), style: style || undefined },
    hasLeft
      ? React.createElement(
          'div',
          { className: leftClasses },
          hasIcon ? iconNode : null,
          hasTitle
            ? React.createElement(
                'div',
                { className: subtitleNode ? 'flex flex-col' : undefined },
                React.createElement('div', { className: titleClassName, style: titleStyle || undefined }, titleNode),
                subtitleNode
                  ? React.createElement('div', { className: subtitleClassName, style: subtitleStyle || undefined }, subtitleNode)
                  : null
              )
            : null
        )
      : null,
    right
      ? React.createElement(
          'div',
          { className: rightClasses },
          resolveNode(right)
        )
      : null
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTCardHeader = TTCardHeader;
  window.TTCardHeader = TTCardHeader;
}
