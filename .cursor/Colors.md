Below are updates to the app colors. We will update the @familyTab.js, @script.js, and others accordingly: 

From familyTab:
- remove color pickers
- replace with 4 accent color themes (see below)
- remove the two background theme pickers

In the app in general, now:
- there are 4 color themes. the user selects the one they want.
- there is only one light mode theme and only one dark mode—both the current primary
- remove from the code feed and sleep accents that are not from the themes below
- remove from the code the "claude" inspired background theme

Color Theme 1: 
{
  "cards": {
    "bottle": {
      "name": "Bottle",
      "icon": "🍼",
      "accent": "#ff4d79"
    },
    "nursing": {
      "name": "Nursing",
      "icon": "🤱",
      "accent": "#ab61ff"
    },
    "sleep": {
      "name": "Sleep",
      "icon": "🌙",
      "accent": "#00b7fa"
    },
    "diaper": {
      "name": "Diaper",
      "icon": "🍑",
      "accent": "#cca83e"
    },
    "solids": {
      "name": "Solids",
      "icon": "🥄",
      "accent": "#5ebe4b"
    }
  },
  "theme": {
    "light": {
      "bg": "#F5F5F7",
      "card": "#FFFFFF",
      "field": "#F5F5F7"
    },
    "dark": {
      "bg": "#000000",
      "card": "#1C1C1E",
      "field": "#2C2C2E"
    }
  }
}

Theme 2:
{
  "cards": {
    "bottle": {
      "name": "Bottle",
      "icon": "🍼",
      "accent": "#f76e90"
    },
    "nursing": {
      "name": "Nursing",
      "icon": "🤱",
      "accent": "#c196e8"
    },
    "sleep": {
      "name": "Sleep",
      "icon": "🌙",
      "accent": "#65cce6"
    },
    "diaper": {
      "name": "Diaper",
      "icon": "🍑",
      "accent": "#998c66"
    },
    "solids": {
      "name": "Solids",
      "icon": "🥄",
      "accent": "#78c46e"
    }
  },
  "theme": {
    "light": {
      "bg": "#F5F5F7",
      "card": "#FFFFFF",
      "field": "#F5F5F7"
    },
    "dark": {
      "bg": "#000000",
      "card": "#1C1C1E",
      "field": "#2C2C2E"
    }
  }
}

Theme 3:
{
  "cards": {
    "bottle": {
      "name": "Bottle",
      "icon": "🍼",
      "accent": "#e4b701"
    },
    "nursing": {
      "name": "Nursing",
      "icon": "🤱",
      "accent": "#5db899"
    },
    "sleep": {
      "name": "Sleep",
      "icon": "🌙",
      "accent": "#fdb172"
    },
    "diaper": {
      "name": "Diaper",
      "icon": "🍑",
      "accent": "#6678d1"
    },
    "solids": {
      "name": "Solids",
      "icon": "🥄",
      "accent": "#c85151"
    }
  },
  "theme": {
    "light": {
      "bg": "#ffffff",
      "card": "#fcf8ef",
      "field": "#F5F5F7"
    },
    "dark": {
      "bg": "#141414",
      "card": "#282827",
      "field": "#3B3B3B"
    }
  }
}

Theme 4:
{
  "cards": {
    "bottle": {
      "name": "Bottle",
      "icon": "🍼",
      "accent": "#6b8542"
    },
    "nursing": {
      "name": "Nursing",
      "icon": "🤱",
      "accent": "#33b4d1"
    },
    "sleep": {
      "name": "Sleep",
      "icon": "🌙",
      "accent": "#df7a6d"
    },
    "diaper": {
      "name": "Diaper",
      "icon": "🍑",
      "accent": "#c67dd8"
    },
    "solids": {
      "name": "Solids",
      "accent": "#57bcba"
    }
  },
}

