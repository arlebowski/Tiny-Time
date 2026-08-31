# AdMob

## iOS

App ID:

```
ca-app-pub-3734956448133132~8807798968
```

Home / Track native:

```
ca-app-pub-3734956448133132/8104891697
```

Day Detail / Timeline native:

```
ca-app-pub-3734956448133132/4293261893
```

## Android

Not configured yet. Monetization is iOS-only.

`react-native-google-mobile-ads` and `react-native-purchases` are excluded from Android
autolinking in `native/package.json` (`expo.autolinking.android.exclude`). Do not remove
those exclusions without also adding a real Android AdMob app ID to `AndroidManifest.xml`
— otherwise Android crashes on launch before JS runs.
