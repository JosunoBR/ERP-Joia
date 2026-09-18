package br.com.mega12.app

import android.app.Application
import br.com.mega12.app.data.api.ApiClient
import br.com.mega12.app.data.local.PreferencesManager

class Mega12Application : Application() {

    lateinit var preferencesManager: PreferencesManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        preferencesManager = PreferencesManager(this)
        ApiClient.init(preferencesManager)
    }

    companion object {
        lateinit var instance: Mega12Application
            private set
    }
}
