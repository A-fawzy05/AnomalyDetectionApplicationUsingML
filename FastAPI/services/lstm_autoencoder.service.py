import torch.nn as nn

class LSTMAutoencoder(nn.Module):
    def __init__(self, input_dim, hidden_dim):
        super().__init__()
        # Encoder: Compresses the sequence
        self.encoder = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        # Decoder: Tries to reconstruct the original sequence from the hidden state
        self.decoder = nn.LSTM(hidden_dim, input_dim, batch_first=True)
        
    def forward(self, x):
        _, (hidden, _) = self.encoder(x)
        # We repeat the hidden state to match sequence length
        x, _ = self.decoder(hidden.repeat(x.shape[1], 1, 1).permute(1, 0, 2))
        return x