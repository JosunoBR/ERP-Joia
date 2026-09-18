# ProGuard rules for Mega12 App
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class br.com.mega12.app.data.model.** { *; }
