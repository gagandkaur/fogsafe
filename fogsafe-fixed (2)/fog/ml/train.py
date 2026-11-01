"""Train an early-warning model and export it as JSON that plain JavaScript can run (no ML library in the browser)."""
import json, numpy as np, pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

df = pd.read_csv('dataset.csv')
FEATURES = ['dist', 'closing', 'ttc', 'other_dv', 'user_kmh', 'other_kmh', 'cross', 'along', 'visibility', 'acc', 'heading_diff']
X, y = df[FEATURES], df['future_risk']
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# class_weight='balanced' pushes the model to favour catching dangerous cases over being "accurate" on easy GREEN ones
clf = DecisionTreeClassifier(max_depth=9, min_samples_leaf=40, class_weight='balanced', random_state=42).fit(Xtr, ytr)

pred = clf.predict(Xte)
base = df.loc[Xte.index, 'now_risk']        # baseline: "risk in 3 s will equal risk now"
print('model  accuracy :', (pred == yte).mean().round(3))
print('baseline accuracy:', (base == yte).mean().round(3))
# the metric that matters for safety: how often a future RED/CRITICAL (>=2) is flagged early
danger = yte >= 2
print('danger recall  model   :', ((pred >= 2) & danger).sum() / danger.sum())
print('danger recall  baseline:', ((base >= 2) & danger).sum() / danger.sum())
print(confusion_matrix(yte, pred))

t = clf.tree_
tree = {
    'features': FEATURES,
    'feature': t.feature.tolist(), 'threshold': t.threshold.tolist(),
    'left': t.children_left.tolist(), 'right': t.children_right.tolist(),
    'value': [int(np.argmax(v)) for v in t.value[:, 0, :]],
    'classes': [int(c) for c in clf.classes_],
}
tree['value'] = [int(clf.classes_[i]) for i in tree['value']]
json.dump(tree, open('risk_model.json', 'w'), separators=(',', ':'))
print('nodes:', t.node_count)
