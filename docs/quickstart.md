# Quick Start

In order to use FuseML one may simply do the following:

### 1. Install the requirements

We assume that a Kubernetes cluster is already up and running. If not a good way to start with a local cluster is to use [KinD](https://kind.sigs.k8s.io/docs/user/quick-start/) or [Rancher K3s](https://k3s.io/).


Additional software requirements:

* helm: install the package provided by your OS, or check upstream installation guide at https://helm.sh/docs/intro/install/

* kubectl: install the package provided by your OS, or check upstream installation guide at https://kubernetes.io/docs/tasks/tools/#kubectl

### 2. Download and install the fuseml-installer

```bash
# On Linux
curl -sfL https://fuseml.github.io/in/installer.ps1 | sh -
```

You should get an output similar to this:

```bash
********* SUCCESS **********
FuseML Installer is ready!
To start using it just run fuseml-installer --help and enjoy!
****************************
```

### 3. Fuseml Installer is ready to go so let's install the components on the cluster:

```bash
fuseml-installer install
```

You should get an output similar to this:

```bash
> fuseml-installer install

🚢 FuseML installing...

Configuration...
  🧭  system_domain: 

🚢 Deploying Istio.....
✔️  Istio deployed
.
✔️  Created system_domain: 10.162.66.101.omg.howdoi.website

🚢 Deploying Quarks.......
✔️  Quarks deployed

🚢 Deploying Workloads...
✔️  Workloads deployed

🚢 Deploying MLflow.......................................................
✔️  Minio deployed (http://minio.10.162.66.101.omg.howdoi.website).

✔️  MLflow deployed (http://mlflow.10.162.66.101.omg.howdoi.website).

🚢 Deploying Gitea..........................................................
✔️  Gitea deployed (http://gitea.10.162.66.101.omg.howdoi.website).

🚢 Deploying Registry.............
✔️  Registry deployed

🚢 Deploying Tekton................................
✔️  Tekton deployed (http://tekton.10.162.66.101.omg.howdoi.website).

🚢 Deploying Core.........
✔️  FuseML core component deployed (http://fuseml-core.10.162.66.101.omg.howdoi.website).

🚢 Downloading command line client...
🚢 FuseML command line client saved as /home/user/fuseml/fuseml.
Copy it to the location within your PATH (e.g. /usr/local/bin).

🚢 
To use the FuseML CLI, you must point it to the FuseML server URL, e.g.:

    export FUSEML_SERVER_URL=http://fuseml-core.10.162.66.101.omg.howdoi.website

✔️  FuseML installed.
System domain: 10.162.66.101.omg.howdoi.website
```

The FuseML installer prints out URLs for mlflow, gitea, tekton and fuseml-core. You can access those sub-services directly at any given time. The fuseml core URL is especially important, as you'll need that to use the FuseML CLI.

### 4. Check if the components are up and running:

```bash
# Let's check the fuseml-core component
kubectl get pods -n fuseml-core -o wide
# Now let's check gitea
kubectl get pods -n gitea -o wide
# Let's check tekton
kubectl get pods -n tekton-pipelines -o wide
```

If everything is in running or completed status, you are good to go. Continue on to the [tutorial](tutorials.md) section and start to have fun with FuseML.