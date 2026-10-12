package com.example.appdamaya;

import android.os.Bundle;

import androidx.activity.EdgeToEdge;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.navigation.fragment.NavHostFragment;

import com.example.appdamaya.databinding.TelaPrincipalBinding;

public class AtividadePrincipal extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        DadosClinica.inicializar(this);
        EdgeToEdge.enable(this);
        TelaPrincipalBinding binding = TelaPrincipalBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        // Attach navigation at runtime so the activity preview stays an empty host.
        // The login layout is authored and previewed only in tela_login.xml.
        NavHostFragment navHost = (NavHostFragment) getSupportFragmentManager()
                .findFragmentById(R.id.nav_host_fragment_content_main);
        if (navHost != null && navHost.getNavController().getCurrentDestination() == null) {
            navHost.getNavController().setGraph(R.navigation.mapa_navegacao);
        }
        ViewCompat.setOnApplyWindowInsetsListener(binding.main, (v, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom);
            return insets;
        });
    }
}
