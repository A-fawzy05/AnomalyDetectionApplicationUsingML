from sklearn.ensemble import IsolationForest

def train_iforest(data):
    # Features: [Amount, Vendor_ID_Encoded, User_ID_Encoded]
    model = IsolationForest(contamination=0.01) # Assume 1% are anomalies
    model.fit(data)
    return model