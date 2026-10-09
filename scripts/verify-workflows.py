"""Structural guard for publication ownership and token-safe data handoff."""
from pathlib import Path
import yaml

# YAML 1.1 considers 'on' a boolean; GitHub workflow syntax treats it as a key.
class WorkflowLoader(yaml.SafeLoader):
    pass
WorkflowLoader.yaml_implicit_resolvers = {
    key: [(tag, regex) for tag,regex in values if tag != 'tag:yaml.org,2002:bool']
    for key,values in yaml.SafeLoader.yaml_implicit_resolvers.items()
}
def load(path):
    return yaml.load(path.read_text(), Loader=WorkflowLoader)

paths = list(Path('.github/workflows').glob('*.yml'))
workflows = {p.name:load(p) for p in paths}
owners=[]
for filename,w in workflows.items():
    for job in w['jobs'].values():
        for step in job.get('steps',[]):
            if step.get('uses','').startswith('actions/deploy-pages@'):
                owners.append(filename)
assert owners == ['publish-site.yml'], f'Unexpected full-site publisher(s): {owners}'
publisher=workflows['publish-site.yml']
assert publisher['on']['workflow_run']['types'] == ['completed']
assert publisher['on']['workflow_run']['branches'] == ['main']
data_files=['fpl-data-sync.yml','pages.yml','arsenal-data-sync.yml','arsenal-scores-sync.yml']
assert set(publisher['on']['workflow_run']['workflows']) == {workflows[f]['name'] for f in data_files}
assert publisher['concurrency']['cancel-in-progress'] == 'false'
assert publisher['on']['push']['branches'] == ['main']
assert 'pull_request' in publisher['on']
verify=publisher['jobs']['verify']
assert 'head_repository.full_name == github.repository' in verify['if']
assert "workflow_run.event != 'pull_request'" in verify['if']
assert 'workflow_run.conclusion' in verify['if']
assert any('verify-hq-release.mjs' in s.get('run','') and 'validate-fpl.mjs' in s.get('run','') for s in verify['steps'])
deploy=publisher['jobs']['deploy']
assert deploy['needs']=='verify'
script=next(s['with']['script'] for s in deploy['steps'] if s.get('uses','').startswith('actions/github-script@'))
assert "pages.build_type !== 'workflow'" in script and 'main.commit.sha !== process.env.SOURCE_SHA' in script
for filename in data_files:
    w=workflows[filename]
    assert w['permissions']=={'contents':'write'}, f'Excess data-job permissions: {filename}'
    assert w['concurrency']['cancel-in-progress']=='false'
    steps=[s for j in w['jobs'].values() for s in j['steps']]
    assert any('bash scripts/commit-data.sh' in s.get('run','') for s in steps), f'Unsafe data commit: {filename}'
    assert any(s.get('uses','').startswith('actions/checkout@') and s.get('with',{}).get('fetch-depth')==0 for s in steps), f'Shallow rebase: {filename}'
print('Workflow ownership PASS: one guarded publisher; four data completion handoffs; read-only PR validation.')
