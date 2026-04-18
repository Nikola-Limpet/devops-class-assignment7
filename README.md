# FoodExpress — CI/CD Pipeline (Assignment 8)

Automated pipeline that builds a Node.js food-ordering API, provisions a fresh
AWS EC2 instance with Terraform, and deploys the Docker container to it — all
kicked off by a GitHub push.

```
GitHub  --push-->  Jenkins  --build-->  Docker image
                      |                      |
                      |--terraform apply---> AWS EC2 (Docker pre-installed)
                      |                      ^
                      |--scp image.tar-------|
                      |--ssh docker run------|
                                             |
                                      http://<public-ip>/menu
```

## Repo layout

| Path | Purpose |
|---|---|
| `app/` | Node.js Express API source (FoodExpress menu/orders/restaurants). |
| `Dockerfile` | Image build recipe — Node 18 Alpine, runs on port 5000. |
| `Jenkinsfile` | Declarative pipeline: checkout → build → save → terraform → ship → deploy → test. |
| `terraform/` | IaC for the target EC2 (AMI lookup, SG, instance, user_data). |

## Prerequisites

### On the Jenkins controller
Install these plugins (Manage Jenkins → Plugins):
- **Pipeline** (usually pre-installed)
- **Git**
- **AWS Credentials** (provides the `AmazonWebServicesCredentialsBinding` step)
- **SSH Agent**
- **Credentials Binding**

Install these CLIs on the same machine that runs the Jenkins build:
- `docker` — and the `jenkins` user must be in the `docker` group
- `terraform` ≥ 1.0
- `ssh`, `scp`, `curl`

### On AWS
1. Create an IAM user with programmatic access and the permissions to manage
   EC2, security groups, and key pairs.
2. Create an EC2 key pair named **`foodexpress-key`** (or set a different
   name in the Jenkinsfile `KEY_NAME` env var and `terraform.tfvars`).
   Download the `.pem` private key — you'll upload it to Jenkins next.

### Jenkins credentials to add
Manage Jenkins → Credentials → (global) → Add:

| Credential ID | Kind | Value |
|---|---|---|
| `aws-credentials` | AWS Credentials | Your IAM access key ID + secret |
| `ec2-ssh-key` | SSH Username with private key | Username `ec2-user`, paste the contents of `foodexpress-key.pem` |

The IDs must match exactly — the Jenkinsfile references them by name.

## How to run the pipeline

1. Push this folder to a GitHub repo (or use the one in the class brief).
2. In Jenkins: **New Item → Pipeline** → "FoodExpress-Pipeline".
3. Under **Pipeline**, choose *Pipeline script from SCM*, point it at your
   GitHub repo, set the script path to `Jenkinsfile`.
4. (Optional) Add a GitHub webhook so pushes trigger builds automatically:
   GitHub repo → Settings → Webhooks → `http://<jenkins-host>/github-webhook/`.
5. Click **Build Now**. Follow the stage view.

On success, the console prints:
```
FoodExpress is live at http://<public-ip>/menu
```

Visit that URL in a browser or curl it:
```sh
curl http://<public-ip>/menu
curl http://<public-ip>/restaurants
curl -X POST http://<public-ip>/order \
     -H "Content-Type: application/json" \
     -d '{"item":"Pizza","quantity":2}'
```

## Pipeline stages (what each one does)

| Stage | What happens | Where |
|---|---|---|
| Checkout | `git clone` the repo | Jenkins workspace |
| Build Docker Image | `docker build` tagged with `$BUILD_NUMBER` | Jenkins machine |
| Save Image to Tar | `docker save -o foodexpress-<n>.tar` | Jenkins machine |
| Terraform Apply | Creates SG + EC2, returns public IP | AWS |
| Wait for cloud-init | SSH retry loop + `cloud-init status --wait` — blocks until user_data finishes installing Docker | Target EC2 |
| Ship Image to EC2 | `scp` the tar file | Jenkins → EC2 |
| Deploy Container | `ssh` + `docker load` + `docker run -p 80:5000` | Target EC2 |
| Smoke Test | `curl http://<ip>/menu` (you implement this — see TODO in Jenkinsfile) | Jenkins → public IP |

## Teardown (important — don't leak sandbox costs)

```sh
cd terraform
terraform destroy -auto-approve \
  -var="aws_region=us-east-1" \
  -var="key_name=foodexpress-key"
```

Or add a `Destroy` stage to the Jenkinsfile (parameterized build) for
one-click teardown.

## Local smoke test (no AWS required)

To verify the app + Dockerfile before running the full pipeline:

```sh
docker build -t foodexpress-local .
docker run --rm -p 5000:5000 foodexpress-local
curl http://localhost:5000/menu
```

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `terraform apply` fails with `InvalidKeyPair.NotFound` | The key pair name in `KEY_NAME` doesn't exist in the region. Check AWS Console → EC2 → Key Pairs. |
| `ssh: Permission denied (publickey)` | The private key in the `ec2-ssh-key` Jenkins credential doesn't match the AWS key pair. |
| Deploy stage fails with `permission denied while trying to connect to the Docker daemon socket` | `ec2-user` isn't in the `docker` group yet — user_data probably hasn't finished. Check that the "Wait for cloud-init" stage actually ran. |
| `curl: (7) Failed to connect to ... port 80` | Security group didn't open port 80, or container didn't start. SSH in and run `docker ps`. |
| Jenkins build is slow on first run | Amazon Linux 2023 user_data does a full `dnf update` — ~2 min. Subsequent runs with a new EC2 have the same delay; consider baking an AMI if it becomes painful. |
