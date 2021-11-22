# Integrating Intel OpenVINO with FuseML

FuseML features a range of extensibility mechanisms aimed at integrating various 3rd party AI/ML tools into a single and coherent MLOps tool stack, on top of which reusable MLOps recipes can be configured to automate the end-to-end ML production workflows.

This tutorial is meant as a typical example of the process required to integrate an existing AI/ML service, framework or platform with FuseML. The particular integration target featured in this guide is Intel OpenVINO and its collection of components. The guide outlines the decisions that were made concerning which OpenVINO components can be integrated with FuseML, and provides details about the actual implementation of FuseML extensions integrating OpenVINO functions into FuseML workflows.

The guide is structured in the following sections:

- [a summary of the extensibility features provided by FuseML](#fuseml-extensibility-options)
- [a high level presentation of OpenVINO components](#openvino-overview) and their role in the MLOps landscape
- notes on the potential strategies used to [integrate OpenVINO components into FuseML](#fuseml-openvino-integration)
- details on the actual [implementation of FuseML extensions for OpenVINO](#openvino-extensions-implementation)

## FuseML Extensibility Options

FuseML currently supports three major extension mechanisms that facilitate the integration of new AI/ML tools without the need to change the FuseML core code: _FuseML Installer Extensions_, the _FuseML Extension Registry_ and _FuseML Workflows_.

### FuseML Installer Extensions

The FuseML installer can be tasked with installing more than just the FuseML core components. It can also be used to simplify the deployment of 3rd party AI/ML services that support Kubernetes as a target platform. Writing a FuseML Installer Extension is as simple as creating a YAML file describing installation steps such as helm charts, kubernetes manifests, kustomize targets or even plain bash scripts.

With FuseML Installer Extensions, users can build installation shortcuts to quickly deploy their own AI/ML tool stack, or reuse one or more of the AI/ML tools already featured in the default [FuseML Installer Extension Repository](https://github.com/fuseml/extensions/tree/main/installer), including but not limited to: MLFlow, KServe and Seldon Core.

The [Installation of ML Extensions](https://github.com/fuseml/fuseml/blob/main/docs/blueprints/001-installation-of-extensions.md) blueprint has detailed information about this feature and how it can be used to extend the installer to cover additional AI/ML tools and services.

### FuseML Extension Registry

The FuseML Extension Registry is basically a database storing information about external AI/ML services and APIs that can be consumed in FuseML workflows. Specifically, each entry in the Extension Registry represents a particular instance of an external AI/ML service or API, and contains information about how it can be accessed (e.g. URLs, endpoints, client configuration and credentials) as well as what specialized roles it can play in the MLOps reference architecture (e.g. data store, model store, prediction platform, experiment tracking, distributed model training etc.).

Registering AI/ML services and APIs with the FuseML Extension Registry allows them to be discovered, accessed and consumed in FuseML workflows. This approach decouples FuseML workflows from the actual back-ends used to execute individual steps and enables users to configure MLOps workflows that are portable and reusable. The Extension Registry API is flexible enough to allow FuseML admins to register any 3rd party AI/ML tool. In addition, [FuseML Installer Extensions](#fuseml-installer-extensions) can be used not only to install AI/ML tools, but also to automatically register them with the FuseML Extension Registry.

The [Extension Registry](https://github.com/fuseml/fuseml/blob/main/docs/blueprints/003-extension-registry.md) blueprint covers detailed information about this extensibility mechanism.

### FuseML Workflows

FuseML workflows are automation processes built out of individual, reusable steps, connected together to form a pipeline. Each step is represented by a container image that implements a particular function in the MLOps lifecycle. Workflow steps can also be thought of as integration mechanisms, especially if they connect to 3rd party services and/or act as adapters for 3rd party APIs. FuseML already features [a collection of workflow step container images](https://github.com/fuseml/extensions/tree/main/images) that implement a variety of ML functions, such as training and serving ML models.

## OpenVINO Overview

OpenVINO consists of the following high level conceptual components that are of interest from an MLOps perspective:

- Intermediate Representation (IR): an open source, nGraph-compatible ML model format that has been optimized for Intel architecture and is usable by the Intel Inference Engine.

- Inference Engine: a selection of software libraries that run inference against the Intermediate Representation (optimized model) to produce inference results.

- Model Optimizer: a cross-platform command-line tool that converts a trained neural network from its source framework to an Intermediate Representation (IR) for use in inference operations. The Model Optimizer imports models trained in popular frameworks such as Caffe, TensorFlow, MXNet, Kaldi, and ONNX and performs a few optimizations to remove excess layers and group operations when possible into simpler, faster graphs.

- OpenVINO Model Server (OVMS): a scalable, high-performance solution for serving machine learning models optimized for Intel architectures. The OVMS server implements a gRPC and REST API framework with data serialization and deserialization using TensorFlow Serving API, and OpenVINO as the inference execution provider. Model repositories may reside on a locally accessible file system (e.g. NFS), Google Cloud Storage (GCS), Amazon S3, Minio or Azure Blob Storage.

- Open Model Zoo: a repository of optimized pre-trained deep learning models.

- Model Downloader: a utility that can be used to download models from the Open Model Zoo.

- OpenVINO Training Extensions: provide a convenient environment to train Deep Learning models and convert them using the OpenVINO toolkit for optimized inference.

- DL Workbench: a platform built upon OpenVINO that provides a web-based graphical environment that enables you to optimize, fine-tune, analyze, visualize, and compare performance of deep learning models on various Intel architecture configurations. In the DL Workbench, you can use most of OpenVINO's toolkit components.

- [DockerHub CI for OpenVINO](https://github.com/openvinotoolkit/docker_ci/tree/master/dockerfiles): a toolkit used to generate a Dockerfile, build, test, and deploy an image with the Intel Distribution of OpenVINO toolkit. You can reuse available Dockerfiles, add your layer, and customize the image of OpenVINO for your needs.

## FuseML OpenVINO Integration

The OpenVINO components that could be of immediate and obvious use in FuseML MLOps workflows are the OpenVINO Model Server and the Model Optimizer. The main goal of the integration is to be able to use the OpenVINO Model Server as a predictor step in FuseML workflows. This should also be coupled with an installer extension that can be used to install any Kubernetes prerequisites through the fuseml-installer.

Having an OVMS server instance that is able to serve a single model (e.g. the output of a training workflow step) is the main use-case target. Serving multiple versions of the same model or even serving multiple different models at the same time is also supported by OVMS.

Given that OVMS only works with models that are in Intermediate Representation format and also require a particular folder structure, a conversion operation is required to support serving models that are trained and saved using other formats. This is where the Model Optimizer component comes in.

To summarize, the following are needed for a minimal integration of OpenVINO as a FuseML model serving component:

- an _OVMS predictor_ FuseML workflow step, similar to the other predictor steps already featured for KServe and Seldon Core, that can deploy and serve a ML model inside an OVMS instance
- an _OVMS converter_ FuseML workflow step is also required to perform the conversion and optimization of ML models from other formats (e.g. TensorFlow saved_model or ONNX) to the IR representation required by OVMS. This conversion logic could be part of the predictor step, but a separation in two individual steps has more advantages, such as better reusability and observability
- a FuseML installer extension that creates the necessary Kubernetes set up required to run the OVMS and the Model Optimizer. These help reduce or even eliminate the effort required to install OpenVINO prerequisites.

Other possible integration variants have been explored and are [documented separately in a FuseML issue](https://github.com/fuseml/fuseml/issues/285).

### OVMS FuseML Integration

Understanding how a 3rd party AI/ML service can be installed and how its APIs can be accessed and consumed is a very important aspect of developing FuseML extensions that integrate with it. This is relevant not only from the point of view of creating FuseML Installer Extensions that can simplify the deployment of 3rd party AI/ML services, but also from the perspective of implementing FuseML workflow steps capable of interacting with them or even of managing their lifecycle.

The simplest of the installation methods available for OVMS is through a Docker container image. OVMS also features a [helm chart](https://github.com/openvinotoolkit/model_server/tree/v2021.3/deploy) that deploys an OVMS instance in a Kubernetes cluster.

Finally, the installation method that is most interesting from a FuseML integration perspective is the [OVMS operator](https://github.com/openvinotoolkit/model_server/tree/main/extras/ovms-operator). It is based on the OVMS helm chart and implemented using the k8s helm operator SDK, meaning:

- the attributes in the OVMS CRD correspond almost 1-to-1 to those present in the helm chart's `values.yaml`
- every OVMS instance deployed by the operator has the same characteristics as an OVMS instance deployed via the helm chart

Another equally important aspect is exploring the capabilities that the 3rd party AI/ML service provides in terms of configuration and programmable APIs, especially those involving well known types of AI/ML artifacts and operations, such as ML models, datasets, metrics, training, validation, inference and so on. A single OVMS instance can serve multiple versions of the same model, as well as different models. This makes possible at least two different integration variants covered in more detail in the sections that follow: [OVMS as an External Service](#ovms-as-an-external-service) and [OVMS as a FuseML Managed Application](#ovms-as-a-fuseml-managed-application).

#### OVMS as an External Service

This option looks at OVMS primarily as an external 3rd party AI/ML tool that is installed and managed separately from FuseML. In this scenario, existing OVMS instances need to be registered in the Extension Registry as individual FuseML extensions. A FuseML Installer Extension can even be implemented to install and register an OVMS instance automatically (i.e. through its helm chart or operator). The OVMS instance(s) registered with the FuseML Extension Registry can then be referenced as prerequisites by the OVMS predictor FuseML workflow step. The only thing the OVMS predictor workflow step would need to do is to update the external OVMS instance(s) to host the ML model received as input.

In this integration variant, the same OVMS instance _may be shared by multiple workflows to serve different ML models_. This is especially useful in situations where a single OVMS instance is using a large pool of hardware resources (CPUs/GPUs) that can be utilized more efficiently when shared by multiple ML models instead of being dedicated to a single model.

Unfortunately, implementing this integration scenario is difficult for two main reasons explained below:

1. the FuseML _OVMS predictor_ workflow step implementation needs a way to "upload" new models and new model versions to a remote OVMS instance that may or may not be managed by FuseML. Given that the official OVMS REST API doesn't provide an "upload model" operation, the only way to achieve that is by accessing its storage backend. OVMS has the ability to periodically reload the models in the model repository, so it should be possible to update the models being served by an OVMS instance by simply updating the models in its storage back-end. However, this only works for providing new versions of the models that are already being served. Instructing the OVMS instance to serve _new_ models [requires a configuration change](https://github.com/openvinotoolkit/model_server/blob/6803f875950cf7626bd1d78af5c93130302ebc5f/deploy/README.md#deploy-openvino-model-server-with-multiple-models-defined-in-a-configuration-file). In the context of integrating OVMS instances that are not installed through nor managed by FuseML, it is more difficult to make assumptions about how configuration changes can be made. Even though [the model store configuration is also periodically reloaded](https://github.com/openvinotoolkit/model_server/blob/main/docs/docker_container.md#updating-configuration-file), its location might not be easily accessible without a programmable API.

2. in addition to the configuration change complication, models need to be uploaded directly in the storage backend used by the OVMS instance. This makes the OVMS predictor workflow step implementation more complex, given that it would need to support and access the range of storage back-ends that can be configured with OVMS (S3, GCS, Azure or local storage).

#### OVMS as a FuseML Managed Application

In this scenario, the OVMS predictor workflow step itself is tasked with managing the entire lifecycle of a standalone OVMS instance that can serve one or more versions of the same model. OVMS instances created by predictor workflow steps are modeled and registered as FuseML Applications.

The deployment of OVMS instances can be simplified somewhat by leveraging the OVMS kubernetes operator, which needs to be installed beforehand using a FuseML Installer Extension and registered with the Extension Registry. This approach is very similar to the one already used by other workflow predictor steps implemented for FuseML, such as KServe and Seldon Core, with one notable difference: the OVMS operator does not cover setting up additional resources needed to expose the OVMS API outside the cluster, such as a Kubernetes ingress or Istio virtual service. These resources also need to be managed by the OVMS predictor step.

The OVMS FuseML Installer Extension only needs to install the OVMS operator in a Kubernetes cluster, whereas the OVMS predictor workflow step is responsible for deploying OVMS CRD instances.

OVMS exposes two APIs: gRPC and RESTful API. They do not include authorization, authentication, or data encryption. These APIs are based on the [TensorFlow Serving APIs](https://www.tensorflow.org/tfx/serving/api_rest).

### OpenVINO Model Converter FuseML Integration

The ML models served with the OpenVINO Model Server must be in Intermediate Representation (IR) format (where the graph is represented in .bin and .xml format). The Intermediate Representation is an Intel specific format (more details [here](https://docs.openvinotoolkit.org/latest/openvino_docs_MO_DG_IR_and_opsets.html)).

Tensorflow, Caffe, MXNet and ONNX trained models can be converted to IR format using the [Model Optimizer](https://docs.openvinotoolkit.org/latest/openvino_docs_MO_DG_Deep_Learning_Model_Optimizer_DevGuide.html) available from the OpenVINO toolkit.

The OpenVINO Model Server requires the models to be present in the local filesystem or they could be hosted remotely on object storage services. Google Cloud, S3 and Azure compatible storage are supported.

Regardless of location, the model files need to follow a particular directory structure. More information on the Model Repository can be found [here](https://github.com/openvinotoolkit/model_server/blob/main/docs/models_repository.md).

## OpenVINO Extensions Implementation

This section contains some more details regarding the implementation of the OpenVINO FuseML extensions. The actual implementation is already available in the FuseML repositories:

- [the FuseML Installer Extension for the OVMS Operator](https://github.com/fuseml/extensions/tree/release-0.3/installer/ovms)
- [the container image implementing the OVMS predictor step](https://github.com/fuseml/extensions/tree/release-0.3/images/inference-services/ovms)
- [the container image implementing the OpenVINO Model Converter step](https://github.com/fuseml/extensions/tree/release-0.3/images/converters/ovms)
- [example end-to-end workflow definition](https://github.com/fuseml/examples/blob/release-0.3/workflows/mlflow-ovms-e2e.yaml) that trains a TensorFlow/Keras model with MLFlow, then converts and serves it with the workflow steps listed above

### FuseML Installer Extension for OVMS Operator

The [official OVMS operator](https://operatorhub.io/operator/ovms-operator) can only be installed with the [Operator Lifecycle Manager (OLM)](https://olm.operatorframework.io/). However, to keep things simple, this implementation uses a Kustomize deployment that installs the OVMS Kubernetes operator that can be tracked down to [this repository](https://github.com/openvinotoolkit/model_server/tree/main/extras/ovms-operator).

Reusing the Kustomize configuration from the official repository is just a matter of writing a `kustomization.yaml` file that points to the remote version:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - github.com/openvinotoolkit/model_server/extras/ovms-operator/config/default?ref=v2021.4.1

images:
  - name: controller
    newName: quay.io/openvino/ovms-operator
    newTag: 0.1.0
```

Developing a FuseML Installer Extension is done by assembling together a `description.yaml` file with installation instructions and other useful information relevant from an integration perspective. Following are sections from the `description.yaml` descriptor created for the OVMS operator:

- the main section describes the product/version and points to the above Kustomize file for installing/uninstalling the OVMS operator:

  ```yaml
  name: ovms
  product: openvino-model-server
  version: "0.1.0"
  description: |
    OpenVINO Model Server Kubernetes Operator
  install:
    - type: kustomize
      location: kustomize
      waitfor:
        - namespace: ovms-operator-system
          selector: control-plane=controller-manager
        - kind: deployment
          selector: control-plane=controller-manager
          namespace: ovms-operator-system
          condition: available
          timeout: 600
  uninstall:
    - type: kustomize
      location: kustomize
  ```

- adding a `services` section informs FuseML to automatically register the OVMS operator with the FuseML Extension Registry as a service that can be accessed from workflow steps. FuseML workflow steps such as the OVMS predictor, that need the OVMS operator to be preinstalled, will need to reference this extension by specifying an extension requirement with a matching `service_resource` field. The _internal_ endpoint URL indicates that the OVMS operator can only be used by workflow steps running in the same Kubernetes cluster (i.e. through a service account). As a side note, it is also be possible to create configurations to allow workflow steps like the OVMS predictor to deploy OVMS instances in remote Kubernetes clusters, provided that Kubernetes credentials are also supplied, but that is not covered here:

  ```yaml
  services:
    - id: API
      resource: ovms-operator
      category: prediction-serving
      description: OpenVINO Model Server Kubernetes Operator API
      endpoints:
        - url: http://kubernetes.default.svc
          type: internal
  ```

- as previously mentioned, a global Istio gateway is required to expose OVMS services outside the Kubernetes cluster. This can be configured in the FuseML Installer Extensions descriptors in the form of a `gateways` element:

  ```yaml
  gateways:
    - name: ovms
      namespace: fuseml-workloads
      hostprefix: "*.ovms"
      port: 80
  ```

- the OVMS predictor workflow step needs to be granted permissions to manage OVMS CRD instances, as well as Istio virtual services. A `rolerules` element can be configured to instruct the FuseML installer to configure these permissions automatically:

  ```yaml
  rolerules:
    - apigroups:
        - intel.com
      resources:
        - ovms
      verbs:
        - get
        - list
        - create
        - patch
        - watch
    - apigroups:
        - networking.istio.io
      resources:
        - gateways
      verbs:
        - get
    - apigroups:
        - networking.istio.io
      resources:
        - virtualservices
      verbs:
        - get
        - list
        - create
        - patch
        - watch
  ```

### FuseML OVMS Predictor Step

Generally speaking, a simple predictor workflow step such as the one built for OVMS should take in as input the location of a ML model, deploy a prediction server (e.g. an OVMS instance) for that model and output the URL where the prediction server API can be accessed to perform inference requests. The input model can be generated, for example, from a training step that precedes the predictor step in a workflow.

OVMS itself already has builtin support for [a range of remote ML model storage options](https://github.com/openvinotoolkit/model_server/blob/main/deploy/README.md#model-repository) (GCS, S3, Azure), which means the OVMS predictor doesn't need to implement any additional logic to download models locally. Depending on the storage service provider (i.e. GCS), it may also need to configure additional secrets to store access credentials, but this particular use-case is left out of the current predictor implementation.

Aside from the model location, a FuseML predictor workflow step should also accept other input parameters that can be passed transparently as backend configuration options. In our case, this refers to some of the [available parameters that can be configured for the OVMS instance](https://github.com/openvinotoolkit/model_server/blob/main/deploy/README.md#helm-options-references) itself:

- number of replicas
- model_name - reflected in the inference URL
- model inference parameters:
  - stateful, nireq, batch_size
  - plugin_config
  - target_device
  - log_level
- storage credentials attributes (S3/AWS, GCP, Azure). Note that the recommended way to pass credentials to workflow steps is through the FuseML Extension Registry.

Workflow step inputs are passed by FuseML to the containers implementing the workflow steps as environment variables that use the `FUSEML_` prefix.

As is the case with all prediction services, the OVMS server needs to be exposed to allow its inference APIs to be consumed from outside the cluster. The OVMS predictor step needs to configure an ingress or an Istio virtual service to expose the OVMS server. Given that currently the only solution supported by FuseML is Istio, it is also the best choice for this task. Two individual parts are needed for this:

- an Istio Gateway that fits a host wildcard able to accommodate all hostnames of all OVMS deployments. This is configured globally through the FuseML Installer Extension declared for the OVMS operator
- one virtual service per OVMS instance, which needs to be created by the OVMS predictor image

An important aspect of implementing a container image for a FuseML workflow step is controlling what happens during consecutive step invocations, e.g. when the workflow is re-triggered automatically to account for changes in the input codeset(s). OVMS is capable of auto-detecting changes in the model repository and configuration. If an update means that a new model version is added to the model storage, or a new model is added to the model repository (in case of a multiple model scenario) nothing else needs to be done. All other changes require a re-deployment of the OVMS kubernetes resource which will trigger a rolling update or a scale-out/in (when the replica count parameter is changes). For our minimalist implementation, this simply means that the predictor step doesn't need to re-deploy the OVMS server if the contents of the input model change.

The complete implementation of the container image for the OVMS predictor workflow step can be viewed [here](https://github.com/fuseml/extensions/tree/release-0.3/images/inference-services/ovms). Following are some snippets from the Dockerfile and associated scripts:

- the Dockerfile layout of the environment variables accepted as input by the predictor step image, corresponding to FuseML workflow step inputs and S3/AWS credentials:

  ```
  ENV FUSEML_ENV_WORKFLOW_NAMESPACE fuseml-workloads
  ENV FUSEML_ENV_WORKFLOW_NAME ""
  ENV AWS_ACCESS_KEY_ID ""
  ENV AWS_SECRET_ACCESS_KEY ""
  ENV S3_ENDPOINT ""
  ENV FUSEML_MODEL ""
  ENV FUSEML_MODEL_NAME default
  ENV FUSEML_OVMS_IMAGE_TAG "2021.4.1"
  ENV FUSEML_PREDICTION_TYPE "predict"
  ```

- the section of the container's entrypoint script that generates the OVMS CRD parameters from the step's inputs. Note how the hostname associated with the Istio virtual service is computed from the host wildcard configured in the global Istio gateway:

  ```bash
  # load org and project from repository if exists,
  # if not, set them as a random string
  if [ -e ".fuseml/_project" ]; then
      ORG=$(cat .fuseml/_org)
      PROJECT=$(cat .fuseml/_project)
  else
      ORG=$(head /dev/urandom | LC_ALL=C tr -dc a-z0-9 | head -c 6)
      PROJECT=$(head /dev/urandom | LC_ALL=C tr -dc a-z0-9 | head -c 6)
  fi

  NAMESPACE=${FUSEML_ENV_WORKFLOW_NAMESPACE}
  OVMS_ISTIO_GATEWAY=ovms-gateway

  # Extracting the domain name is done by looking at the Istio Gateway created in the
  # same namespace by the OVMS installer extension and extracting the domain out of the
  # host wildcard configured in the form of '*.<domain>'
  DOMAIN=$(kubectl get Gateway ${OVMS_ISTIO_GATEWAY} -n ${NAMESPACE} -o jsonpath='{.spec.servers[0].hosts[0]}')
  ISTIO_HOST="${ORG}.${PROJECT}${DOMAIN/\*/}"
  APP_NAME="${ORG}-${PROJECT}"

  cat << EOF > /opt/openvino/templates/values.yaml
  #@data/values
  ---
  namespace: "${NAMESPACE}"
  name_suffix: "${APP_NAME}"
  labels:
    fuseml/app-name: "${PROJECT}"
    fuseml/org: "${ORG}"
    fuseml/app-guid: "${ORG}.${PROJECT}"
    fuseml/workflow: "${FUSEML_ENV_WORKFLOW_NAME}"
  ovms_image_tag: "${FUSEML_OVMS_IMAGE_TAG}"
  aws_access_key_id: "${AWS_ACCESS_KEY_ID}"
  aws_secret_access_key: "${AWS_SECRET_ACCESS_KEY}"
  s3_compat_api_endpoint: "${S3_ENDPOINT}"
  model_path: "${FUSEML_MODEL}"
  model_name: "${FUSEML_MODEL_NAME}"
  istio_host: "${ISTIO_HOST}"
  istio_gateway: "${OVMS_ISTIO_GATEWAY}"
  EOF
  ```

- an example of how a FuseML workflow step registers a FuseML Application object, in this case corresponding to the created OVMS prediction server instance. `register_fuseml_app` is available as [a FuseML helper function](https://github.com/fuseml/extensions/blob/release-0.3/images/inference-services/base/scripts/helpers.sh#L15) that can be imported and used in any container image:

  ```bash
  # Now, register the new application within fuseml; use kubectl only to format the output correctly
  ytt -f /opt/openvino/templates/ | kubectl apply -f - --dry-run=client -o json | register_fuseml_app \
    --name "${APP_NAME}" \
    --desc "OVMS service deployed for ${FUSEML_MODEL}" \
    --url "${prediction_url}" \
    --type predictor
  ```

### FuseML OpenVINO Model Converter Step

This workflow step leverages the OpenVINO Model Optimizer utilities and is required to convert models to the OpenVINO supported formats (IR) and model repository file structure.

The container image required for this workflow step can be constructed using a prebuilt OpenVINO toolkit container image (~6GB in size, out of which 4GB are python packages for AI/ML) that provides all the necessary tools, or [building a custom image](https://docs.openvinotoolkit.org/latest/openvino_docs_install_guides_installing_openvino_docker_linux.html). For the sake of simplicity and to reduce technical debt, the former is used: the official OpenVINO toolkit container image is used as a base image and some additional software package requirements are installed on top.

Aside from actual model conversion, the converter step also has to play a second function, that of interfacing with various object storage services (S3/AWS, GCS) used to store ML models. To be able to do that, it must be able to act as a client, and it does that by means of the minio client, which conveniently has support for all three: Minio, AWS S3 storage and Google Cloud Storage.

The conversion step leverages MLFlow to auto-detect the format of the input model, if available.

The conversion procedure [is different depending on the type of input model](https://docs.openvinotoolkit.org/latest/openvino_docs_MO_DG_prepare_model_convert_model_Converting_Model.html). For TensorFlow in particular, the signature for the model inputs need to be fully defined, otherwise the conversion results in error. The `--batch 1` option is very useful here.
