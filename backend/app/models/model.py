import torch
import torch.nn as nn

   
class ModalityTower(nn.Module):
    def __init__(self, input_dim, hidden_dims):
        super(ModalityTower, self).__init__()
        layers = []

        tower_dropout = 0.3

        for i in range(len(hidden_dims) - 1):
            layers.append(nn.Linear(hidden_dims[i], hidden_dims[i+1]))
            layers.append(nn.BatchNorm1d(hidden_dims[i+1]))
            layers.append(nn.LeakyReLU())
            layers.append(nn.Dropout(tower_dropout))
        self.tower = nn.Sequential(
            nn.Linear(input_dim, hidden_dims[0]),
            nn.BatchNorm1d(hidden_dims[0]),
            nn.LeakyReLU(),
            nn.Dropout(tower_dropout),
            *layers
        )

    def forward(self, x):
        return self.tower(x)

class AttentionFusion(nn.Module):
    def __init__(self, embed_dim):
        super(AttentionFusion, self).__init__()
        self.query = nn.Parameter(torch.randn(1, embed_dim))
        self.attn = nn.MultiheadAttention(embed_dim, num_heads=1, batch_first=True)

    def forward(self, x):  # x: [B, M, D]
        batch_size = x.size(0)
        query = self.query.expand(batch_size, 1, -1)  # [B, 1, D]
        attn_output, _ = self.attn(query, x, x)       # [B, 1, D]
        return attn_output.squeeze(1)                 # [B, D]

class MultiInputNN(nn.Module):
    def __init__(self, sponsor_dim=384, disease_dim=768, text_dim=768, num_features=7):
        super(MultiInputNN, self).__init__()

        # Modality-specific towers
        self.sponsor_tower = ModalityTower(sponsor_dim, [256, 128, 64])
        self.disease_tower = ModalityTower(disease_dim, [256, 128, 64])
        self.inclusion_tower = ModalityTower(text_dim, [256, 128, 64])
        self.exclusion_tower = ModalityTower(text_dim, [256, 128, 64])
        self.summary_tower = ModalityTower(text_dim, [256, 128, 64])

        # Attention-based fusion
        self.fusion = AttentionFusion(embed_dim=64)

        # Numerical projection
        self.numerical_proj = nn.Sequential(
            nn.Linear(num_features, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(),
            nn.Dropout(0.2)
        )

        final_dropout = 0.3

        # UPDATED: Final prediction head without sigmoid (BCEWithLogitsLoss handles it)
        self.final_head = nn.Sequential(
            nn.Linear(64 + 32, 128),
            nn.BatchNorm1d(128),
            nn.LeakyReLU(),
            nn.Dropout(final_dropout),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.LeakyReLU(),
            nn.Dropout(final_dropout),
            nn.Linear(64, 1)  # Removed nn.Sigmoid() - BCEWithLogitsLoss applies it internally
        )

        
    def enable_mc_dropout(self):
        for m in self.modules():
            if isinstance(m, torch.nn.Dropout):
                m.train()


    def forward(self, sponsor, disease, inclusion, exclusion, summary, numerical):
        sponsor_out = self.sponsor_tower(sponsor)
        disease_out = self.disease_tower(disease)
        inclusion_out = self.inclusion_tower(inclusion)
        exclusion_out = self.exclusion_tower(exclusion)
        summary_out = self.summary_tower(summary)

        # Stack modality outputs and fuse
        modality_stack = torch.stack(
            [sponsor_out, disease_out, inclusion_out, exclusion_out, summary_out], dim=1
        )  # [B, 5, D]
        fused = self.fusion(modality_stack)  # [B, D]

        # Process numerical features
        numerical_proj = self.numerical_proj(numerical)

        # Final prediction
        combined = torch.cat([fused, numerical_proj], dim=1)
        return self.final_head(combined)