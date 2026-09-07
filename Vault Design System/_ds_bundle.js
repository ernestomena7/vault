/* @ds-bundle: {"format":4,"namespace":"VaultDesignSystem_72e5ce","components":[{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"StatusPill","sourcePath":"components/feedback/StatusPill.jsx"},{"name":"Tag","sourcePath":"components/feedback/Tag.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"FileDropzone","sourcePath":"components/forms/FileDropzone.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Icon","sourcePath":"components/foundations/Icon.jsx"},{"name":"Breadcrumbs","sourcePath":"components/navigation/Breadcrumbs.jsx"},{"name":"Sidebar","sourcePath":"components/navigation/Sidebar.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Dialog","sourcePath":"components/overlay/Dialog.jsx"},{"name":"DropdownMenu","sourcePath":"components/overlay/DropdownMenu.jsx"},{"name":"Tooltip","sourcePath":"components/overlay/Tooltip.jsx"}],"sourceHashes":{"components/data/Avatar.jsx":"1b24924f279f","components/data/Card.jsx":"d2db2892aecd","components/data/Table.jsx":"0c477eec283e","components/feedback/Badge.jsx":"482748be9377","components/feedback/ProgressBar.jsx":"8d6a04e1fb4c","components/feedback/StatusPill.jsx":"beea8985693e","components/feedback/Tag.jsx":"dfaf5968dc4c","components/feedback/Toast.jsx":"f334438d831b","components/forms/Button.jsx":"1f65858d8223","components/forms/Checkbox.jsx":"f837ddee72d0","components/forms/FileDropzone.jsx":"d3d1f1574168","components/forms/IconButton.jsx":"6ee6085a59e1","components/forms/Input.jsx":"65d3272e30ae","components/forms/Radio.jsx":"2772cb2cc567","components/forms/Select.jsx":"4e5c52a25d2d","components/forms/Switch.jsx":"994632c27357","components/forms/Textarea.jsx":"4b053f3e13b9","components/foundations/Icon.jsx":"9efc8a59d2e3","components/navigation/Breadcrumbs.jsx":"d7ea20dd84ad","components/navigation/Sidebar.jsx":"94835d833922","components/navigation/Tabs.jsx":"45b3d1766e0e","components/overlay/Dialog.jsx":"0b42be6530b1","components/overlay/DropdownMenu.jsx":"8308890ff595","components/overlay/Tooltip.jsx":"e0439cb52530","ui_kits/vault-app/AdminScreen.jsx":"7c3f34c39b92","ui_kits/vault-app/AppShell.jsx":"78d94d665e9c","ui_kits/vault-app/ApprovalsScreen.jsx":"970e3f1a059a","ui_kits/vault-app/DashboardScreen.jsx":"25bf71658b3b","ui_kits/vault-app/PlayerScreen.jsx":"848955b7b59d","ui_kits/vault-app/ProfileScreen.jsx":"f833c86b5277","ui_kits/vault-app/UploadsScreen.jsx":"d8e681d0127f","ui_kits/vault-app/data.js":"3fda9265c95b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.VaultDesignSystem_72e5ce = window.VaultDesignSystem_72e5ce || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/Avatar.jsx
try { (() => {
const SIZES = {
  sm: 24,
  md: 32,
  lg: 40
};
const COLORS = ['#6e5bff', '#38bdf8', '#34d399', '#fbbf24', '#f2495c'];
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
}
function Avatar({
  name,
  src,
  size = 'md',
  style
}) {
  const dim = SIZES[size];
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  const bg = COLORS[hash(name || '?') % COLORS.length];
  return src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: dim,
      height: dim,
      borderRadius: 'var(--radius-full)',
      objectFit: 'cover',
      ...style
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      width: dim,
      height: dim,
      borderRadius: 'var(--radius-full)',
      background: bg,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-sans)',
      fontSize: dim * 0.4,
      fontWeight: 'var(--fw-semibold)',
      flexShrink: 0,
      ...style
    }
  }, initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function Card({
  children,
  padding = 20,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/Table.jsx
try { (() => {
function Table({
  columns,
  rows,
  onRowClick,
  style
}) {
  const [hoveredRow, setHoveredRow] = React.useState(null);
  return /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(col => /*#__PURE__*/React.createElement("th", {
    key: col.key,
    style: {
      textAlign: 'left',
      padding: '10px 12px',
      fontSize: 'var(--text-label)',
      color: 'var(--text-tertiary)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, col.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    onClick: () => onRowClick && onRowClick(row),
    onMouseEnter: () => setHoveredRow(i),
    onMouseLeave: () => setHoveredRow(null),
    style: {
      background: hoveredRow === i ? 'var(--bg-surface-raised)' : 'transparent',
      cursor: onRowClick ? 'pointer' : 'default'
    }
  }, columns.map(col => /*#__PURE__*/React.createElement("td", {
    key: col.key,
    style: {
      padding: '12px',
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-primary)',
      borderBottom: '1px solid var(--bg-surface-raised)',
      fontFamily: col.mono ? 'var(--font-mono)' : 'inherit'
    }
  }, col.render ? col.render(row) : row[col.key]))))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
const TONE = {
  neutral: {
    bg: 'var(--bg-surface-overlay)',
    color: 'var(--text-secondary)'
  },
  accent: {
    bg: 'var(--accent-subtle-bg)',
    color: 'var(--accent-hover)'
  },
  success: {
    bg: 'var(--status-approved-bg)',
    color: 'var(--status-approved)'
  },
  warning: {
    bg: 'var(--status-pending-bg)',
    color: 'var(--status-pending)'
  },
  danger: {
    bg: 'var(--status-rejected-bg)',
    color: 'var(--status-rejected)'
  }
};
function Badge({
  children,
  tone = 'neutral',
  style
}) {
  const t = TONE[tone];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      height: 20,
      padding: '0 8px',
      borderRadius: 'var(--radius-full)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--fw-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      background: t.bg,
      color: t.color,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function ProgressBar({
  value,
  indeterminate,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      borderRadius: 'var(--radius-full)',
      background: 'var(--bg-surface-raised)',
      overflow: 'hidden',
      ...style
    }
  }, indeterminate ? /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: '100%',
      borderRadius: 'var(--radius-full)',
      backgroundImage: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
      backgroundSize: '60% 100%',
      backgroundRepeat: 'no-repeat',
      animation: 'vault-progress-sweep 1.4s linear infinite'
    }
  }) : /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${Math.min(100, Math.max(0, value))}%`,
      background: 'var(--accent)',
      borderRadius: 'var(--radius-full)',
      transition: `width var(--duration-base) var(--ease-standard)`
    }
  }));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Radio({
  label,
  checked,
  disabled,
  onChange,
  name,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    name: name,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      display: 'none'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-full)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
      background: 'var(--bg-surface-raised)'
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 9,
      height: 9,
      borderRadius: 'var(--radius-full)',
      background: 'var(--accent)'
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  label,
  checked,
  disabled,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      display: 'none'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 20,
      borderRadius: 'var(--radius-full)',
      position: 'relative',
      flexShrink: 0,
      background: checked ? 'var(--accent)' : 'var(--bg-surface-overlay)',
      border: '1px solid var(--border-subtle)',
      transition: `background var(--duration-base) var(--ease-standard)`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 18 : 2,
      width: 14,
      height: 14,
      borderRadius: 'var(--radius-full)',
      background: '#fff',
      transition: `left var(--duration-base) var(--ease-standard)`
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  label,
  placeholder,
  helperText,
  error,
  rows = 4,
  disabled,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      width: '100%',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--fw-medium)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    placeholder: placeholder,
    rows: rows,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      padding: '10px 12px',
      resize: 'vertical',
      font: 'inherit',
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)',
      background: disabled ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
      border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      outline: 'none',
      boxShadow: focused ? 'var(--shadow-focus)' : 'none'
    }
  }, rest)), (helperText || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: error ? 'var(--danger)' : 'var(--text-tertiary)'
    }
  }, error || helperText));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/foundations/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICONS = {
  'x': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m6 6 12 12"
  })),
  'upload-cloud': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 12v9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m16 16-4-4-4 4"
  })),
  'user': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })),
  'bell': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  'check': /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }),
  'chevron-down': /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }),
  'chevron-right': /*#__PURE__*/React.createElement("path", {
    d: "m9 18 6-6-6-6"
  }),
  'search': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  'settings': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  'more-horizontal': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "12",
    r: "1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "5",
    cy: "12",
    r: "1"
  })),
  'download': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7 10 12 15 17 10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "15",
    x2: "12",
    y2: "3"
  })),
  'folder': /*#__PURE__*/React.createElement("path", {
    d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
  }),
  'copy': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "13",
    height: "13",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
  })),
  'log-out': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  })),
  'play': /*#__PURE__*/React.createElement("polygon", {
    points: "6 3 20 12 6 21 6 3"
  }),
  'volume-2': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("polygon", {
    points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15.54 8.46a5 5 0 0 1 0 7.07"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.07 4.93a10 10 0 0 1 0 14.14"
  })),
  'maximize': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M8 3H5a2 2 0 0 0-2 2v3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 8V5a2 2 0 0 0-2-2h-3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 16v3a2 2 0 0 0 2 2h3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 21h3a2 2 0 0 0 2-2v-3"
  })),
  'film': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "20",
    rx: "2.18",
    ry: "2.18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "7",
    y1: "2",
    x2: "7",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "2",
    x2: "17",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "7",
    x2: "7",
    y2: "7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "17",
    x2: "7",
    y2: "17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "17",
    x2: "22",
    y2: "17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "17",
    y1: "7",
    x2: "22",
    y2: "7"
  })),
  'alert-circle': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12.01",
    y2: "16"
  })),
  'loader-2': /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-6.219-8.56"
  }),
  'user-plus': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "19",
    y1: "8",
    x2: "19",
    y2: "14"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "11",
    x2: "16",
    y2: "11"
  })),
  'trash-2': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "11",
    x2: "10",
    y2: "17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "11",
    x2: "14",
    y2: "17"
  })),
  'pencil': /*#__PURE__*/React.createElement("path", {
    d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"
  }),
  'check-circle-2': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "22 4 12 14.01 9 11.01"
  })),
  'x-circle': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "9",
    x2: "9",
    y2: "15"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "9",
    x2: "15",
    y2: "15"
  })),
  'layout-dashboard': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "12",
    width: "7",
    height: "9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "16",
    width: "7",
    height: "5"
  })),
  'shield': /*#__PURE__*/React.createElement("path", {
    d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  }),
  'hard-drive': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("line", {
    x1: "22",
    y1: "12",
    x2: "2",
    y2: "12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "16",
    x2: "6.01",
    y2: "16"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "16",
    x2: "10.01",
    y2: "16"
  })),
  'clock': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  })),
  'minus': /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }),
  'info': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "16",
    x2: "12",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "8",
    x2: "12.01",
    y2: "8"
  })),
  'alert-triangle': /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "17",
    x2: "12.01",
    y2: "17"
  }))
};
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  style,
  className,
  ...rest
}) {
  const glyph = ICONS[name];
  return /*#__PURE__*/React.createElement("svg", _extends({
    className: className,
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      display: 'inline-block',
      ...style
    }
  }, rest), glyph);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundations/Icon.jsx", error: String((e && e.message) || e) }); }

// components/feedback/StatusPill.jsx
try { (() => {
const TONE = {
  pending: {
    bg: 'var(--status-pending-bg)',
    color: 'var(--status-pending)',
    icon: 'clock'
  },
  approved: {
    bg: 'var(--status-approved-bg)',
    color: 'var(--status-approved)',
    icon: 'check-circle-2'
  },
  rejected: {
    bg: 'var(--status-rejected-bg)',
    color: 'var(--status-rejected)',
    icon: 'x-circle'
  },
  processing: {
    bg: 'var(--status-processing-bg)',
    color: 'var(--status-processing)',
    icon: 'loader-2'
  }
};
const LABEL = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  processing: 'Processing'
};
function StatusPill({
  status,
  style
}) {
  const t = TONE[status];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 24,
      padding: '0 10px',
      borderRadius: 'var(--radius-full)',
      background: t.bg,
      color: t.color,
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-body-sm)',
      fontWeight: 'var(--fw-semibold)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 13,
    color: t.color,
    style: status === 'processing' ? {
      animation: 'vault-spin 1s linear infinite'
    } : undefined
  }), LABEL[status]);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tag.jsx
try { (() => {
function Tag({
  children,
  onRemove,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 26,
      padding: '0 6px 0 10px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-surface-raised)',
      border: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-sm)',
      color: 'var(--text-secondary)',
      ...style
    }
  }, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": "Remove",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 16,
      height: 16,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12
  })));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = 'neutral',
  title,
  description,
  onClose,
  style
}) {
  const icon = {
    neutral: 'info',
    success: 'check-circle-2',
    warning: 'alert-triangle',
    danger: 'alert-circle'
  }[tone];
  const color = {
    neutral: 'var(--text-secondary)',
    success: 'var(--status-approved)',
    warning: 'var(--status-pending)',
    danger: 'var(--status-rejected)'
  }[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      width: 340,
      padding: 14,
      background: 'var(--bg-surface-glass)',
      backdropFilter: 'blur(var(--blur-panel))',
      WebkitBackdropFilter: 'blur(var(--blur-panel))',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-sans)',
      animation: 'vault-fade-in var(--duration-slow) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 18,
    color: color,
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, description)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Dismiss",
    style: {
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      color: 'var(--text-tertiary)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    height: 32,
    paddingInline: 12,
    fontSize: 'var(--text-body-sm)',
    gap: 6,
    iconSize: 15
  },
  md: {
    height: 40,
    paddingInline: 16,
    fontSize: 'var(--text-body-md)',
    gap: 8,
    iconSize: 17
  },
  lg: {
    height: 48,
    paddingInline: 20,
    fontSize: 'var(--text-body-lg)',
    gap: 8,
    iconSize: 19
  }
};
const BASE = {
  primary: 'var(--accent)',
  secondary: 'var(--bg-surface-raised)',
  ghost: 'transparent',
  danger: 'var(--danger)'
};
const HOVER = {
  primary: 'var(--accent-hover)',
  secondary: 'var(--bg-surface-overlay)',
  ghost: 'var(--bg-surface-raised)',
  danger: '#ff6376'
};
const ACTIVE = {
  primary: 'var(--accent-active)',
  secondary: 'var(--bg-surface-overlay)',
  ghost: 'var(--bg-surface-overlay)',
  danger: 'var(--danger)'
};
const TEXT = {
  primary: 'var(--text-on-accent)',
  secondary: 'var(--text-primary)',
  ghost: 'var(--text-secondary)',
  danger: '#fff'
};
const BORDER = {
  primary: '1px solid transparent',
  secondary: '1px solid var(--border-subtle)',
  ghost: '1px solid transparent',
  danger: '1px solid transparent'
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconTrailing,
  loading,
  disabled,
  fullWidth,
  children,
  style,
  onClick,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const s = SIZES[size];
  const isDisabled = disabled || loading;
  const bg = isDisabled ? BASE[variant] : pressed ? ACTIVE[variant] : hovered ? HOVER[variant] : BASE[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    disabled: isDisabled,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setPressed(false);
    },
    onMouseDown: () => setPressed(true),
    onMouseUp: () => setPressed(false),
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      height: s.height,
      padding: `0 ${s.paddingInline}px`,
      width: fullWidth ? '100%' : undefined,
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      fontWeight: 'var(--fw-semibold)',
      color: TEXT[variant],
      background: bg,
      border: BORDER[variant],
      borderRadius: 'var(--radius-md)',
      cursor: isDisabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: `background var(--duration-fast) var(--ease-standard)`,
      outline: 'none',
      boxShadow: 'none',
      ...style
    },
    onFocus: e => {
      e.target.style.boxShadow = 'var(--shadow-focus)';
    },
    onBlur: e => {
      e.target.style.boxShadow = 'none';
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-2",
    size: s.iconSize,
    style: {
      animation: 'vault-spin 0.8s linear infinite'
    }
  }) : icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.iconSize
  }) : null, children, !loading && iconTrailing ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconTrailing,
    size: s.iconSize
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Checkbox({
  label,
  checked,
  indeterminate,
  disabled,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      display: 'none'
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 18,
      height: 18,
      borderRadius: 'var(--radius-sm)',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: checked || indeterminate ? 'var(--accent)' : 'var(--bg-surface-raised)',
      border: checked || indeterminate ? '1px solid var(--accent)' : '1px solid var(--border-strong)',
      transition: `background var(--duration-fast) var(--ease-standard)`
    }
  }, (checked || indeterminate) && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: indeterminate ? 'minus' : 'check',
    size: 13,
    color: "var(--text-on-accent)"
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)'
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/FileDropzone.jsx
try { (() => {
function FileDropzone({
  state = 'idle',
  fileName,
  progress = 0,
  errorText,
  onBrowse,
  style
}) {
  const [dragging, setDragging] = React.useState(false);
  const isDragging = state === 'dragging' || dragging;
  return /*#__PURE__*/React.createElement("div", {
    onDragEnter: e => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDragOver: e => e.preventDefault(),
    onDrop: e => {
      e.preventDefault();
      setDragging(false);
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '32px 20px',
      borderRadius: 'var(--radius-lg)',
      textAlign: 'center',
      fontFamily: 'var(--font-sans)',
      border: `1.5px dashed ${state === 'error' ? 'var(--danger)' : isDragging ? 'var(--accent)' : 'var(--border-strong)'}`,
      background: isDragging ? 'var(--accent-subtle-bg)' : 'var(--bg-surface)',
      transition: `border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)`,
      ...style
    }
  }, state === 'uploading' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "film",
    size: 26,
    color: "var(--accent)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-mono)'
    }
  }, fileName), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '70%',
      height: 6,
      background: 'var(--bg-surface-raised)',
      borderRadius: 'var(--radius-full)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${progress}%`,
      height: '100%',
      background: 'var(--accent)',
      borderRadius: 'var(--radius-full)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, progress, "% uploaded")) : state === 'error' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "alert-circle",
    size: 26,
    color: "var(--danger)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--danger)'
    }
  }, errorText || "Hmm, that upload didn't go through."), /*#__PURE__*/React.createElement("button", {
    onClick: onBrowse,
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--accent)',
      fontSize: 'var(--text-body-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, "Try again")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "upload-cloud",
    size: 26,
    color: isDragging ? 'var(--accent)' : 'var(--text-tertiary)'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)'
    }
  }, "Drag a video here, or ", /*#__PURE__*/React.createElement("span", {
    onClick: onBrowse,
    style: {
      color: 'var(--accent)',
      cursor: 'pointer',
      textDecoration: 'underline'
    }
  }, "browse")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, "MP4, MOV, or MKV up to 10GB")));
}
Object.assign(__ds_scope, { FileDropzone });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FileDropzone.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 28,
  md: 36,
  lg: 44
};
const ICON_SIZES = {
  sm: 15,
  md: 17,
  lg: 19
};
const BASE = {
  primary: 'var(--accent)',
  secondary: 'var(--bg-surface-raised)',
  ghost: 'transparent'
};
const HOVER = {
  primary: 'var(--accent-hover)',
  secondary: 'var(--bg-surface-overlay)',
  ghost: 'var(--bg-surface-raised)'
};
const COLOR = {
  primary: 'var(--text-on-accent)',
  secondary: 'var(--text-primary)',
  ghost: 'var(--text-secondary)'
};
function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  disabled,
  'aria-label': ariaLabel,
  style,
  ...rest
}) {
  const [hovered, setHovered] = React.useState(false);
  const dim = SIZES[size];
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    disabled: disabled,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      border: variant === 'secondary' ? '1px solid var(--border-subtle)' : '1px solid transparent',
      borderRadius: 'var(--radius-md)',
      background: hovered && !disabled ? HOVER[variant] : BASE[variant],
      color: COLOR[variant],
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      transition: `background var(--duration-fast) var(--ease-standard)`,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: ICON_SIZES[size]
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Input({
  label,
  placeholder,
  helperText,
  error,
  icon,
  trailing,
  disabled,
  size = 'md',
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const height = size === 'sm' ? 32 : size === 'lg' ? 48 : 40;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      width: '100%',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--fw-medium)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      height,
      padding: '0 12px',
      background: disabled ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
      border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: focused ? 'var(--shadow-focus)' : 'none',
      transition: `border-color var(--duration-fast) var(--ease-standard)`
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("input", _extends({
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      font: 'inherit',
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)'
    }
  }, rest)), trailing), (helperText || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: error ? 'var(--danger)' : 'var(--text-tertiary)'
    }
  }, error || helperText));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  options = [],
  value,
  onChange,
  helperText,
  error,
  disabled,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      width: '100%',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--fw-medium)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: '100%',
      height: 40,
      padding: '0 36px 0 12px',
      appearance: 'none',
      font: 'inherit',
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)',
      background: disabled ? 'var(--bg-surface)' : 'var(--bg-surface-raised)',
      border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      outline: 'none',
      boxShadow: focused ? 'var(--shadow-focus)' : 'none'
    }
  }, rest), options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16,
    color: "var(--text-tertiary)",
    style: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none'
    }
  })), (helperText || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: error ? 'var(--danger)' : 'var(--text-tertiary)'
    }
  }, error || helperText));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumbs.jsx
try { (() => {
function Breadcrumbs({
  items,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-sm)',
      ...style
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 12,
    color: "var(--text-tertiary)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: i === items.length - 1 ? 'var(--text-primary)' : 'var(--text-tertiary)',
      cursor: i === items.length - 1 ? 'default' : 'pointer'
    }
  }, item))));
}
Object.assign(__ds_scope, { Breadcrumbs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumbs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Sidebar.jsx
try { (() => {
function Sidebar({
  items,
  activeValue,
  onChange,
  footer,
  style
}) {
  const [hovered, setHovered] = React.useState(null);
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: 232,
      height: '100%',
      padding: 12,
      boxSizing: 'border-box',
      background: 'var(--bg-canvas)',
      borderRight: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-sans)',
      gap: 2,
      ...style
    }
  }, items.map(item => {
    const active = item.value === activeValue;
    return /*#__PURE__*/React.createElement("button", {
      key: item.value,
      onClick: () => onChange && onChange(item.value),
      onMouseEnter: () => setHovered(item.value),
      onMouseLeave: () => setHovered(null),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 36,
        padding: '0 10px',
        border: 'none',
        textAlign: 'left',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 'var(--text-body-md)',
        fontWeight: 'var(--fw-medium)',
        background: active ? 'var(--accent-subtle-bg)' : hovered === item.value ? 'var(--bg-surface-raised)' : 'transparent',
        color: active ? 'var(--accent-hover)' : 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: item.icon,
      size: 17,
      color: active ? 'var(--accent-hover)' : 'var(--text-tertiary)'
    }), item.label);
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), footer);
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Sidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items,
  value,
  onChange,
  style
}) {
  const [hovered, setHovered] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, items.map(item => {
    const active = item.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: item.value,
      onClick: () => onChange && onChange(item.value),
      onMouseEnter: () => setHovered(item.value),
      onMouseLeave: () => setHovered(null),
      style: {
        position: 'relative',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        padding: '10px 14px',
        fontSize: 'var(--text-body-md)',
        fontWeight: 'var(--fw-medium)',
        color: active ? 'var(--text-primary)' : hovered === item.value ? 'var(--text-secondary)' : 'var(--text-tertiary)'
      }
    }, item.label, active && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -1,
        height: 2,
        background: 'var(--accent)',
        borderRadius: 'var(--radius-full)'
      }
    }));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Dialog.jsx
try { (() => {
function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  style
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'rgba(8,8,11,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 420,
      background: 'var(--bg-surface-glass)',
      backdropFilter: 'blur(var(--blur-panel))',
      WebkitBackdropFilter: 'blur(var(--blur-panel))',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-lg)',
      padding: 24,
      fontFamily: 'var(--font-sans)',
      animation: 'vault-fade-in var(--duration-slow) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-md)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      marginTop: 6
    }
  }, description)), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    icon: "x",
    "aria-label": "Close",
    onClick: onClose
  })), children && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 20
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlay/DropdownMenu.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function DropdownMenu({
  trigger,
  items,
  open,
  onOpenChange,
  align = 'start'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => onOpenChange && onOpenChange(!open)
  }, trigger), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      marginTop: 6,
      [align === 'end' ? 'right' : 'left']: 0,
      minWidth: 180,
      background: 'var(--bg-surface-glass)',
      backdropFilter: 'blur(var(--blur-panel))',
      WebkitBackdropFilter: 'blur(var(--blur-panel))',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      padding: 6,
      zIndex: 150,
      animation: 'vault-fade-in var(--duration-fast) var(--ease-standard)'
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement(MenuItem, _extends({
    key: i
  }, item, {
    onOpenChange: onOpenChange
  })))));
}
function MenuItem({
  label,
  icon,
  danger,
  onSelect,
  onOpenChange
}) {
  const [hovered, setHovered] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onClick: () => {
      onSelect && onSelect();
      onOpenChange && onOpenChange(false);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      height: 32,
      padding: '0 8px',
      border: 'none',
      textAlign: 'left',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-body-sm)',
      background: hovered ? 'var(--bg-surface-raised)' : 'transparent',
      color: danger ? 'var(--danger)' : 'var(--text-primary)'
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 15,
    color: danger ? 'var(--danger)' : 'var(--text-tertiary)'
  }), label);
}
Object.assign(__ds_scope, { DropdownMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/DropdownMenu.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Tooltip.jsx
try { (() => {
function Tooltip({
  label,
  children,
  side = 'top'
}) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: 6
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: 6
    }
  }[side];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false)
  }, children, open && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      ...pos,
      whiteSpace: 'nowrap',
      padding: '5px 9px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--neutral-50)',
      color: 'var(--neutral-950)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-body-sm)',
      fontWeight: 'var(--fw-medium)',
      boxShadow: 'var(--shadow-md)',
      zIndex: 200,
      animation: 'vault-fade-in var(--duration-fast) var(--ease-standard)'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/AdminScreen.jsx
try { (() => {
function AdminScreen() {
  const {
    Card,
    Tabs,
    Table,
    Avatar,
    Switch,
    Select,
    Button,
    Tag
  } = window.VaultDesignSystem_72e5ce;
  const {
    users,
    namingTemplates
  } = window.VaultData;
  const [tab, setTab] = React.useState('users');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-primary)'
    }
  }, "Admin"), tab === 'users' && /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "user-plus",
    size: "sm"
  }, "Invite person")), /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      value: 'users',
      label: 'Users'
    }, {
      value: 'folders',
      label: 'Folders'
    }, {
      value: 'naming',
      label: 'Naming rules'
    }],
    value: tab,
    onChange: setTab
  }), tab === 'users' && /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 20px 16px'
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'name',
      label: 'Person',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        name: r.name,
        size: "sm"
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          color: 'var(--text-primary)'
        }
      }, r.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-tertiary)'
        }
      }, r.email)))
    }, {
      key: 'role',
      label: 'Role'
    }, {
      key: 'active',
      label: 'Active',
      render: r => /*#__PURE__*/React.createElement(Switch, {
        checked: r.active
      })
    }],
    rows: users
  }))), tab === 'folders' && /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, ['/marketing/q3-launch', '/leadership/all-hands', '/product/demo-reel', '/support/training'].map(f => /*#__PURE__*/React.createElement("div", {
    key: f,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-md)',
      color: 'var(--text-primary)'
    }
  }, f), /*#__PURE__*/React.createElement(Select, {
    options: [{
      value: 'auto',
      label: 'Auto-approve'
    }, {
      value: 'review',
      label: 'Requires review'
    }],
    value: "review",
    style: {
      width: 200
    }
  })))), tab === 'naming' && /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, namingTemplates.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.value,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(Tag, null, t.label), /*#__PURE__*/React.createElement(Switch, {
    checked: t.value === 'std'
  })))));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  AdminScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/AdminScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/AppShell.jsx
try { (() => {
function VideoThumb({
  size = 64
}) {
  const {
    Icon
  } = window.VaultDesignSystem_72e5ce;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height: size * 0.62,
      borderRadius: 'var(--radius-sm)',
      flexShrink: 0,
      background: 'linear-gradient(135deg, var(--neutral-700), var(--neutral-600))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: size * 0.22,
    color: "var(--text-tertiary)"
  }));
}
function AppShell({
  active,
  onNavigate,
  children
}) {
  const {
    Sidebar,
    Avatar,
    Input
  } = window.VaultDesignSystem_72e5ce;
  const user = window.VaultData.currentUser;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--bg-app)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    items: [{
      value: 'dashboard',
      label: 'Dashboard',
      icon: 'layout-dashboard'
    }, {
      value: 'uploads',
      label: 'Uploads',
      icon: 'upload-cloud'
    }, {
      value: 'approvals',
      label: 'Approvals',
      icon: 'check-circle-2'
    }, {
      value: 'admin',
      label: 'Admin',
      icon: 'shield'
    }],
    activeValue: active,
    onChange: onNavigate,
    footer: /*#__PURE__*/React.createElement("div", {
      onClick: () => onNavigate('profile'),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: active === 'profile' ? 'var(--accent-subtle-bg)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement(Avatar, {
      name: user.name,
      size: "sm"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 'var(--text-body-sm)',
        color: 'var(--text-primary)',
        fontWeight: 'var(--fw-medium)'
      }
    }, user.name))
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '14px 28px',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 280
    }
  }, /*#__PURE__*/React.createElement(Input, {
    icon: "search",
    placeholder: "Search uploads, folders, people\u2026",
    size: "sm"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-sm)',
      color: 'var(--text-tertiary)'
    }
  }, "vault.company.com")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 28
    }
  }, children)));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  VideoThumb,
  AppShell
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/ApprovalsScreen.jsx
try { (() => {
function ApprovalsScreen() {
  const {
    Card,
    Avatar,
    Button,
    Tabs,
    Dialog,
    Textarea
  } = window.VaultDesignSystem_72e5ce;
  const {
    VideoThumb
  } = window.VaultUI;
  const {
    approvalQueue
  } = window.VaultData;
  const [tab, setTab] = React.useState('pending');
  const [rejecting, setRejecting] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      position: 'relative',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-primary)'
    }
  }, "Approvals"), /*#__PURE__*/React.createElement(Tabs, {
    items: [{
      value: 'pending',
      label: `Pending (${approvalQueue.length})`
    }, {
      value: 'approved',
      label: 'Approved'
    }, {
      value: 'rejected',
      label: 'Rejected'
    }],
    value: tab,
    onChange: setTab
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, approvalQueue.map(item => /*#__PURE__*/React.createElement(Card, {
    key: item.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(VideoThumb, {
    size: 72
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-md)',
      color: 'var(--text-primary)'
    }
  }, item.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)',
      marginTop: 4,
      fontFamily: 'var(--font-mono)'
    }
  }, item.folder), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: item.owner,
    size: "sm"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)'
    }
  }, item.owner, " \xB7 submitted ", item.submitted))), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "x",
    onClick: () => setRejecting(item)
  }, "Reject"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "check"
  }, "Approve")))), /*#__PURE__*/React.createElement(Dialog, {
    open: !!rejecting,
    title: `Reject ${rejecting ? rejecting.name : ''}?`,
    description: "This sends the video back to the uploader with your note.",
    onClose: () => setRejecting(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: () => setRejecting(null)
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      variant: "danger",
      size: "sm",
      onClick: () => setRejecting(null)
    }, "Reject video"))
  }, /*#__PURE__*/React.createElement(Textarea, {
    label: "Reason for rejection",
    rows: 3,
    placeholder: "Explain what needs to change\u2026"
  })));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  ApprovalsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/ApprovalsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/DashboardScreen.jsx
try { (() => {
function DashboardScreen({
  onNavigate
}) {
  const {
    Card,
    Table,
    Avatar,
    StatusPill,
    Icon,
    Breadcrumbs
  } = window.VaultDesignSystem_72e5ce;
  const {
    VideoThumb
  } = window.VaultUI;
  const {
    stats,
    uploads,
    currentUser
  } = window.VaultData;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-display-md)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-primary)'
    }
  }, "Welcome back, ", currentUser.name.split(' ')[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-secondary)',
      marginTop: 4
    }
  }, "Here's what's moving through Vault this week.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, stats.map(s => /*#__PURE__*/React.createElement(Card, {
    key: s.label,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: s.icon,
    size: 18,
    color: "var(--accent)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-primary)'
    }
  }, s.value), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, s.label)))), /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, "Recent uploads"), /*#__PURE__*/React.createElement("div", {
    onClick: () => onNavigate('uploads'),
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--accent)',
      cursor: 'pointer'
    }
  }, "View all")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 20px 16px'
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'name',
      label: 'File',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(VideoThumb, {
        size: 48
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-mono-sm)',
          color: 'var(--text-primary)'
        }
      }, r.name), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 'var(--text-body-sm)',
          color: 'var(--text-tertiary)',
          marginTop: 2
        }
      }, /*#__PURE__*/React.createElement(Breadcrumbs, {
        items: r.folder.split('/').filter(Boolean)
      }))))
    }, {
      key: 'owner',
      label: 'Owner',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Avatar, {
        name: r.owner,
        size: "sm"
      }), r.owner)
    }, {
      key: 'duration',
      label: 'Duration',
      mono: true
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(StatusPill, {
        status: r.status
      })
    }],
    rows: uploads
  }))));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  DashboardScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/PlayerScreen.jsx
try { (() => {
function PlayerScreen() {
  const {
    Icon,
    ProgressBar,
    Badge,
    IconButton,
    Card
  } = window.VaultDesignSystem_72e5ce;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-md)',
      color: 'var(--text-primary)'
    }
  }, "onboarding_2026-09-02_v3.mp4"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "warning"
  }, "Temporary link"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, "Expires in 5h 42m \xB7 streaming only, download disabled"))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: '100%',
      aspectRatio: '16/9',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--neutral-800), var(--neutral-700))',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: 'var(--radius-full)',
      background: 'var(--bg-surface-glass)',
      backdropFilter: 'blur(var(--blur-panel))',
      WebkitBackdropFilter: 'blur(var(--blur-panel))',
      border: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "play",
    size: 28,
    color: "var(--text-primary)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '10px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      background: 'linear-gradient(transparent, rgba(0,0,0,0.55))'
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: 38
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "play",
    variant: "ghost",
    "aria-label": "Play",
    style: {
      color: '#fff'
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "volume-2",
    variant: "ghost",
    "aria-label": "Volume",
    style: {
      color: '#fff'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-mono-sm)',
      color: '#fff'
    }
  }, "01:36 / 04:12"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "maximize",
    variant: "ghost",
    "aria-label": "Fullscreen",
    style: {
      color: '#fff'
    }
  })))), /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, "Uploaded by"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)',
      marginTop: 4
    }
  }, "Marta Reyes")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, "Folder"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)',
      marginTop: 4,
      fontFamily: 'var(--font-mono)'
    }
  }, "/marketing/q3-launch")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-label)',
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, "Size"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-md)',
      color: 'var(--text-primary)',
      marginTop: 4
    }
  }, "1.2 GB"))));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  PlayerScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/PlayerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/ProfileScreen.jsx
try { (() => {
function ProfileScreen() {
  const {
    Card,
    Avatar,
    Input,
    Switch,
    Button,
    IconButton
  } = window.VaultDesignSystem_72e5ce;
  const user = window.VaultData.currentUser;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-primary)'
    }
  }, "Profile"), /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: user.name,
    size: "lg"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, user.role))), /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Name",
    defaultValue: user.name
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Email",
    defaultValue: user.email
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Email me when a video is approved or rejected",
    checked: true
  }), /*#__PURE__*/React.createElement(Switch, {
    label: "Auto-approve my own re-uploads",
    checked: false
  })), /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--fw-medium)'
    }
  }, "Personal API token"), /*#__PURE__*/React.createElement(Input, {
    defaultValue: "vlt_live_9f3a2b7c21e4",
    readOnly: true,
    trailing: /*#__PURE__*/React.createElement(IconButton, {
      icon: "copy",
      "aria-label": "Copy token"
    }),
    style: {
      fontFamily: 'var(--font-mono)'
    }
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "danger",
    style: {
      alignSelf: 'flex-start'
    },
    icon: "log-out"
  }, "Sign out"));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  ProfileScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/UploadsScreen.jsx
try { (() => {
function UploadsScreen() {
  const {
    Card,
    FileDropzone,
    Select,
    Input,
    Table,
    StatusPill,
    Button,
    Tag,
    IconButton
  } = window.VaultDesignSystem_72e5ce;
  const {
    uploads,
    namingTemplates
  } = window.VaultData;
  const [template, setTemplate] = React.useState('std');
  const [state, setState] = React.useState('idle');
  const preview = namingTemplates.find(t => t.value === template).label.replace('{project}', 'q3-launch').replace('{date}', '2026-09-02').replace('{n}', '4').replace('{owner}', 'mreyes');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-lg)',
      fontWeight: 'var(--fw-bold)',
      color: 'var(--text-primary)'
    }
  }, "Upload a video"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.1fr 0.9fr',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FileDropzone, {
    state: state,
    fileName: "onboarding_v3.mp4",
    progress: 64,
    onBrowse: () => setState(state === 'idle' ? 'uploading' : 'idle')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-tertiary)'
    }
  }, "Click the dropzone to preview upload states.")), /*#__PURE__*/React.createElement(Card, {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Select, {
    label: "Destination folder",
    options: [{
      value: 'a',
      label: '/marketing/q3-launch'
    }, {
      value: 'b',
      label: '/leadership/all-hands'
    }, {
      value: 'c',
      label: '/product/demo-reel'
    }]
  }), /*#__PURE__*/React.createElement(Select, {
    label: "Naming convention",
    value: template,
    onChange: e => setTemplate(e.target.value),
    options: namingTemplates
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-sm)',
      color: 'var(--text-secondary)',
      fontWeight: 'var(--fw-medium)',
      marginBottom: 6
    }
  }, "Resulting filename"), /*#__PURE__*/React.createElement(Tag, null, preview, ".mp4")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    icon: "upload-cloud",
    fullWidth: true
  }, "Start upload"))), /*#__PURE__*/React.createElement(Card, {
    padding: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      borderBottom: '1px solid var(--border-subtle)',
      fontSize: 'var(--text-heading-sm)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, "All uploads"), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '4px 20px 16px'
    }
  }, /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'name',
      label: 'File',
      mono: true
    }, {
      key: 'folder',
      label: 'Folder',
      mono: true
    }, {
      key: 'size',
      label: 'Size',
      mono: true
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(StatusPill, {
        status: r.status
      })
    }, {
      key: 'actions',
      label: '',
      render: () => /*#__PURE__*/React.createElement(IconButton, {
        icon: "more-horizontal",
        "aria-label": "More"
      })
    }],
    rows: uploads
  }))));
}
window.VaultUI = Object.assign(window.VaultUI || {}, {
  UploadsScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/UploadsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault-app/data.js
try { (() => {
window.VaultData = {
  currentUser: {
    name: 'Marta Reyes',
    email: 'marta@company.com',
    role: 'Admin'
  },
  stats: [{
    label: 'Uploads this week',
    value: '48',
    icon: 'upload-cloud'
  }, {
    label: 'Pending approvals',
    value: '6',
    icon: 'clock'
  }, {
    label: 'Storage used',
    value: '812 GB',
    icon: 'hard-drive'
  }, {
    label: 'Active stream links',
    value: '13',
    icon: 'play'
  }],
  uploads: [{
    id: 1,
    name: 'onboarding_2026-09-02_v3.mp4',
    folder: '/marketing/q3-launch',
    owner: 'Marta Reyes',
    size: '1.2 GB',
    duration: '04:12',
    status: 'approved'
  }, {
    id: 2,
    name: 'q3_recap_final.mov',
    folder: '/leadership/all-hands',
    owner: 'Devon Lee',
    size: '3.4 GB',
    duration: '18:40',
    status: 'pending'
  }, {
    id: 3,
    name: 'raw_capture_09.mkv',
    folder: '/product/demo-reel',
    owner: 'Priya Nair',
    size: '640 MB',
    duration: '02:05',
    status: 'rejected'
  }, {
    id: 4,
    name: 'support_faq_update.mp4',
    folder: '/support/training',
    owner: 'Jonas Kim',
    size: '980 MB',
    duration: '07:33',
    status: 'processing'
  }, {
    id: 5,
    name: 'brand_refresh_teaser.mov',
    folder: '/marketing/q3-launch',
    owner: 'Marta Reyes',
    size: '2.1 GB',
    duration: '01:12',
    status: 'approved'
  }],
  approvalQueue: [{
    id: 2,
    name: 'q3_recap_final.mov',
    folder: '/leadership/all-hands',
    owner: 'Devon Lee',
    submitted: '2h ago'
  }, {
    id: 4,
    name: 'support_faq_update.mp4',
    folder: '/support/training',
    owner: 'Jonas Kim',
    submitted: '5h ago'
  }, {
    id: 6,
    name: 'partner_webinar_raw.mp4',
    folder: '/marketing/webinars',
    owner: 'Priya Nair',
    submitted: '1d ago'
  }],
  users: [{
    name: 'Marta Reyes',
    email: 'marta@company.com',
    role: 'Admin',
    active: true
  }, {
    name: 'Devon Lee',
    email: 'devon@company.com',
    role: 'Approver',
    active: true
  }, {
    name: 'Priya Nair',
    email: 'priya@company.com',
    role: 'Uploader',
    active: true
  }, {
    name: 'Jonas Kim',
    email: 'jonas@company.com',
    role: 'Uploader',
    active: false
  }],
  namingTemplates: [{
    value: 'std',
    label: '{project}_{date}_v{n}'
  }, {
    value: 'alt',
    label: '{date}_{project}_{owner}'
  }, {
    value: 'raw',
    label: 'raw_{project}_{n}'
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.FileDropzone = __ds_scope.FileDropzone;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Breadcrumbs = __ds_scope.Breadcrumbs;

__ds_ns.Sidebar = __ds_scope.Sidebar;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.DropdownMenu = __ds_scope.DropdownMenu;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
