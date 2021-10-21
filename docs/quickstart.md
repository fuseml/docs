# Quick Start

In order to use FuseML one may simply do the following:

### 1. Install the requirements

We assume that a Kubernetes cluster is already up and running. If not a good way to start with a local cluster is to use [KinD](https://kind.sigs.k8s.io/docs/user/quick-start/), [Rancher K3s](https://k3s.io/) or [k3d](https://k3d.io/).

It is also necessary that your cluster setup includes a storage class marked as default.

**IMPORTANT**: if you're installing a Rancher K3s cluster, it's recommended to skip installing the default Traefik ingress controller. The FuseML installer deploys Istio as a component and Istio is also required by some of the 3rd party tools that FuseML is integrated with (e.g. KNative, KFServing).

Additional software requirements:

* *helm*: install the package provided by your OS, or check [upstream installation guide](https://helm.sh/docs/intro/install/)

* *kubectl*: install the package provided by your OS, or check [upstream installation guide](https://kubernetes.io/docs/tasks/tools/#kubectl)

### 2. Download and install the fuseml-installer

```bash
# On Linux
curl -sfL https://raw.githubusercontent.com/fuseml/fuseml/main/install.sh | sh -
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
  🧭  extension_repository: https://raw.githubusercontent.com/fuseml/extensions/main/installer/

🚢 Deploying Istio.....
✔️  Istio deployed
.
✔️  Created system_domain: 172.18.0.2.nip.io

🚢 Deploying Workloads...
✔️  Workloads deployed

🚢 Deploying Gitea.................................
✔️  Gitea deployed (http://gitea.172.18.0.2.nip.io).

🚢 Deploying Registry..........
✔️  Registry deployed

🚢 Deploying Tekton.............................................................................
✔️  Tekton deployed (http://tekton.172.18.0.2.nip.io).

🚢 Deploying Core...........
✔️  FuseML core component deployed (http://fuseml-core.172.18.0.2.nip.io).

🚢 Downloading command line client...
🚢 FuseML command line client saved as /home/jsuchome/kubernetes/fuseml/fuseml.
Copy it to the location within your PATH (e.g. /usr/local/bin).

🚢 To use the FuseML CLI, you must point it to the FuseML server URL, e.g.:

    export FUSEML_SERVER_URL=http://fuseml-core.172.18.0.2.nip.io

✔️  FuseML installed.
System domain: 172.18.0.2.nip.io
```

The FuseML installer prints out URLs for *gitea*, *tekton* and *fuseml-core* components. You can access those sub-services directly at any given time. The fuseml core URL is especially important, as you'll need that to use the FuseML CLI.

You can also see that the installer downloaded *fuseml* command line client which you will use for actual FuseML operations. You can use the latest version which was downloaded automatically or manually choose one of [released versions](https://github.com/fuseml/fuseml-core/releases) from github.

Use

```bash
fuseml-installer install --help
```

to get full information about the options the installer provides.


### 4. Check if the components are up and running:

```bash
# Let's check the fuseml-core component
kubectl get pods -n fuseml-core -o wide
# Now let's check gitea
kubectl get pods -n gitea -o wide
# Let's check tekton
kubectl get pods -n tekton-pipelines -o wide
```

If everything is in running or completed status, you are good to go. Continue on to the [tutorial](tutorials/kfserving-basic.md) section and start to have fun with FuseML.
