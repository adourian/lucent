import torch
import torch.nn as nn

class MultiInputNN(nn.Module):
    def __init__(self, sponsor_dim=384, disease_dim=768, text_dim=768, num_features=7):
        super(MultiInputNN, self).__init__()

        dropout_rate = 0.6

        # Separate processing layers for each input type
        self.sponsor_layer = nn.Sequential(
            nn.Linear(sponsor_dim, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
        )

        self.disease_layer = nn.Sequential(
            nn.Linear(disease_dim, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            # nn.Linear(128, 64),
            # nn.BatchNorm1d(64),
            # nn.LeakyReLU(),
            # nn.Dropout(dropout_rate)
        )

        self.inclusion_layer = nn.Sequential(
            nn.Linear(text_dim, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate)
        )

        self.exclusion_layer = nn.Sequential(
            nn.Linear(text_dim, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
        )

        self.brief_summary_layer = nn.Sequential(
            nn.Linear(text_dim, 256),
            nn.BatchNorm1d(256),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            
        )

        # Joint processing layers
        combined_dim = 64*5 + num_features  # processed inputs + numerical features
        self.joint_layers = nn.Sequential(
            nn.Linear(combined_dim, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )

    def enable_mc_dropout(self):
        for m in self.modules():
            if isinstance(m, torch.nn.Dropout):
                m.train()

    def forward(self, sponsor, disease, inclusion, exclusion, brief_summary, numerical):
        sponsor_processed = self.sponsor_layer(sponsor)
        disease_processed = self.disease_layer(disease)
        inclusion_processed = self.inclusion_layer(inclusion)
        exclusion_processed = self.exclusion_layer(exclusion)
        brief_summary_processed = self.brief_summary_layer(brief_summary)

        combined = torch.cat([sponsor_processed, disease_processed,
                              inclusion_processed, exclusion_processed,
                              brief_summary_processed,
                              numerical], dim=1)

        output = self.joint_layers(combined)
        return output
    
