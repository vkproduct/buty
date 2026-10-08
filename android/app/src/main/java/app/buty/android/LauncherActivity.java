package app.buty.android;

/**
 * Точка входа приложения. Вся логика — в LauncherActivity из android-browser-helper:
 * проверяет связь приложения с сайтом (Digital Asset Links), показывает заставку
 * и открывает https://buty.app в Trusted Web Activity. Если на телефоне нет браузера
 * с поддержкой TWA, сайт откроется в Custom Tab (см. fallbackType в strings.xml).
 */
public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
}
