from zope.interface import implements
from twisted.cred import portal, checkers, credentials, error as credError
from twisted.internet import defer, reactor
from twisted.web import static, resource
from twisted.web.resource import IResource
from twisted.web.guard import HTTPAuthSessionWrapper
from twisted.web.guard import DigestCredentialFactory

from twisted.web.server import Site
from twisted.web.static import File
from cuwo.script import (ServerScript)


class PasswordDictChecker:
    implements(checkers.ICredentialsChecker)
    credentialInterfaces = (credentials.IUsernamePassword,
                            credentials.IUsernameHashedPassword)

    def __init__(self, config):
        self.passwords = config.passwords

    def requestAvatarId(self, credentials):
        username = credentials.username
        if username in self.passwords:
            if credentials.checkPassword(self.passwords[username]):
                return defer.succeed(username)
            else:
                return defer.fail(
                    credError.UnauthorizedLogin("Bad password"))
        else:
            return defer.fail(
                credError.UnauthorizedLogin("No such user"))


class HttpPasswordRealm(object):
    implements(portal.IRealm)

    def __init__(self, myresource):
        self.myresource = myresource

    def requestAvatar(self, user, mind, *interfaces):
        if IResource in interfaces:
            return IResource, self.myresource, lambda: None
        raise NotImplementedError()


class SiteOverride(Site):
    noisy = False

    def log(self, request):
        pass


class WebScriptFactory(ServerScript):
    connection_class = None

    def on_load(self):
        self.config = self.server.config.web
        with open('./scripts/webpanel/assets/js/init.js', 'w') as f:
            port = self.config.websocket_port
            auth = self.config.auth_key
            f.write('var server_port = "%s";\nvar auth_key = "%s";' % (port,
                                                                       auth))
        root = File('./scripts/webpanel')
        root.indexNames = ['index.html']
        root.putChild('assets', static.File("./scripts/webpanel/assets"))

        checker = PasswordDictChecker(self.config)
        realm = HttpPasswordRealm(root)
        p = portal.Portal(realm, [checker])

        credentialFactory = DigestCredentialFactory("md5",
                                                    "Cuwo webpanel Login")
        protected_resource = HTTPAuthSessionWrapper(p, [credentialFactory])

        auth_resource = resource.Resource()
        auth_resource.putChild("", protected_resource)
        site = SiteOverride(auth_resource)

        reactor.listenTCP(self.config.web_panel_port, site)


def get_class():
    return WebScriptFactory
