#!/usr/bin/env python3
"""
Debug the data at each stage of the pipeline before IF and LSTM models
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

try:
    import pandas as pd
    from ingestion.ocel2_ingester import OCEL2Ingester
    from features.case_features import build_case_features
    
    def debug_pipeline_data():
        print("=== Debugging Pipeline Data Before Models ===")
        
        # Step 1: Test ingester output
        print("\n1. Testing OCEL2 Ingester Output:")
        ingester = OCEL2Ingester()
        df = ingester.ingest('ocel2-p2p.json')
        
        print(f"   Total events: {len(df)}")
        print(f"   Unique cases: {df['case_id'].nunique()}")
        print(f"   Vendor column present: {'vendor' in df.columns}")
        print(f"   Amount column present: {'amount' in df.columns}")
        print(f"   All columns: {list(df.columns)}")
        
        if 'vendor' in df.columns:
            vendor_count = df['vendor'].notna().sum()
            print(f"   Events with vendor: {vendor_count}")
        
        # Check vendor and amount values
        if 'vendor' in df.columns and 'amount' in df.columns:
            sample_vendor = df['vendor'].dropna().iloc[0] if not df['vendor'].dropna().empty else 'No vendor data'
            sample_amount = df['amount'].dropna().iloc[0] if not df['amount'].dropna().empty else 'No amount data'
            print(f"   Sample vendor: {sample_vendor}")
            print(f"   Sample amount: {sample_amount}")
        
        # Check case ID patterns
        case_ids = df['case_id'].unique()
        print(f"   Sample case IDs: {list(case_ids[:10])}")
        
        # Check if quotations are grouped under POs
        quotation_cases = [cid for cid in case_ids if cid.startswith('quotation:')]
        po_cases = [cid for cid in case_ids if cid.startswith('purchase_order:')]
        print(f"   Quotation case IDs: {len(quotation_cases)}")
        print(f"   Purchase order case IDs: {len(po_cases)}")
        
        # Step 2: Test case features output
        print("\n2. Testing Case Features Output:")
        X_case = build_case_features(df)
        
        print(f"   Case features shape: {X_case.shape}")
        print(f"   Vendor column present: {'vendor' in X_case.columns}")
        print(f"   Amount column present: {'amount' in X_case.columns}")
        
        if 'vendor' in X_case.columns:
            vendor_count = X_case['vendor'].notna().sum()
            print(f"   Cases with vendor: {vendor_count}")
        
        # Check case ID patterns in features
        if 'case_id' in X_case.columns:
            feature_case_ids = X_case['case_id'].unique()
            print(f"   Sample feature case IDs: {list(feature_case_ids[:10])}")
            
            # Check if quotations are grouped under POs
            feature_quotation_cases = [cid for cid in feature_case_ids if cid.startswith('quotation:')]
            feature_po_cases = [cid for cid in feature_case_ids if cid.startswith('purchase_order:')]
            print(f"   Feature quotation case IDs: {len(feature_quotation_cases)}")
            print(f"   Feature purchase order case IDs: {len(feature_po_cases)}")
        
        # Step 3: Check specific quotation events
        print("\n3. Checking Specific Quotation Events:")
        quotation_events = df[df['case_id'].str.startswith('quotation:')].head(5)
        for _, row in quotation_events.iterrows():
            print(f"   Event: {row['event_id']}")
            print(f"   Activity: {row['activity']}")
            print(f"   Case ID: {row['case_id']}")
            print(f"   Vendor: {row.get('vendor', 'N/A')}")
            print(f"   Amount: {row.get('amount', 'N/A')}")
            print()
        
        # Step 4: Check specific PO events for comparison
        print("\n4. Checking Specific Purchase Order Events:")
        po_events = df[df['case_id'].str.startswith('purchase_order:')].head(5)
        for _, row in po_events.iterrows():
            print(f"   Event: {row['event_id']}")
            print(f"   Activity: {row['activity']}")
            print(f"   Case ID: {row['case_id']}")
            print(f"   Vendor: {row.get('vendor', 'N/A')}")
            print(f"   Amount: {row.get('amount', 'N/A')}")
            print()
        
        return {
            'ingester_events': len(df),
            'ingester_cases': df['case_id'].nunique(),
            'ingester_quotation_cases': len(quotation_cases),
            'ingester_po_cases': len(po_cases),
            'case_features_shape': X_case.shape,
            'case_features_has_vendor': 'vendor' in X_case.columns,
            'case_features_has_amount': 'amount' in X_case.columns
        }
    
    if __name__ == "__main__":
        debug_pipeline_data()
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
